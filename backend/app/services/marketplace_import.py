"""Marketplace import from warehouse / shipments — one-way snapshot only.

IMPORTANT (MVP contract):
- ``market_listings.quantity_available`` is a **snapshot** taken at import/publish time.
  It is NOT a live link to ``inventory_items.current_stock`` or shipment tonnes.
- Changing warehouse stock after import does **not** auto-update the listing;
  the seller updates the listing manually. No reserve/write-off on import.
- This module only SELECTs from inventory_items / shipments — never UPDATE/INSERT there.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryItem
from app.models.marketplace import MarketListing, MarketSellerProfile
from app.models.organization import Organization
from app.models.shipment import Shipment
from app.schemas.marketplace import (
    MarketImportInventorySource,
    MarketImportShipmentSource,
    MarketImportSourcesResponse,
    MarketListingResponse,
)
from app.services.marketplace_category_mapping import resolve_market_category_id

# Active listing statuses that block re-import of the same source.
_ACTIVE_IMPORT_STATUSES = ('draft', 'pending_review', 'published')


def listing_to_response(row: MarketListing) -> MarketListingResponse:
    photos = row.photos if isinstance(row.photos, list) else []
    return MarketListingResponse(
        id=row.id,
        org_id=row.org_id,
        seller_profile_id=row.seller_profile_id,
        category_id=row.category_id,
        title=row.title,
        description=row.description,
        price=Decimal(str(row.price)),
        unit=row.unit,
        quantity_available=Decimal(str(row.quantity_available)),
        photos=photos,
        status=row.status,
        source_type=row.source_type,
        source_id=row.source_id,
        rejection_reason=row.rejection_reason,
        created_at=row.created_at,
        updated_at=row.updated_at,
        published_at=row.published_at,
    )


async def _imported_source_ids(
    db: AsyncSession,
    org_id: UUID,
    source_type: str,
) -> set[UUID]:
    result = await db.execute(
        select(MarketListing.source_id).where(
            MarketListing.org_id == org_id,
            MarketListing.source_type == source_type,
            MarketListing.status.in_(_ACTIVE_IMPORT_STATUSES),
            MarketListing.source_id.is_not(None),
        )
    )
    return {row[0] for row in result.all() if row[0] is not None}


async def list_import_sources(
    db: AsyncSession,
    org_id: UUID,
) -> MarketImportSourcesResponse:
    """Read-only catalog of inventory + shipments eligible for marketplace draft import."""
    imported_inv = await _imported_source_ids(db, org_id, 'inventory')
    imported_ship = await _imported_source_ids(db, org_id, 'shipment')

    inv_rows = (
        await db.execute(
            select(InventoryItem)
            .where(
                InventoryItem.org_id == org_id,
                InventoryItem.is_active.is_(True),
            )
            .order_by(InventoryItem.name)
        )
    ).scalars().all()

    inventory = [
        MarketImportInventorySource(
            source_id=item.id,
            name=item.name,
            quantity=Decimal(str(item.current_stock)),
            unit=item.unit,
            category=item.category,
            already_imported=item.id in imported_inv,
        )
        for item in inv_rows
    ]

    ship_rows = (
        await db.execute(
            select(Shipment)
            .where(Shipment.org_id == org_id)
            .order_by(Shipment.date.desc(), Shipment.created_at.desc())
            .limit(200)
        )
    ).scalars().all()

    shipments = [
        MarketImportShipmentSource(
            source_id=row.id,
            name=row.crop_type,
            quantity=Decimal(str(row.quantity_kg)),
            unit='кг',
            date=row.date.isoformat() if row.date else None,
            destination=row.destination,
            already_imported=row.id in imported_ship,
        )
        for row in ship_rows
    ]

    return MarketImportSourcesResponse(inventory=inventory, shipments=shipments)


async def get_or_create_seller_profile(
    db: AsyncSession,
    org_id: UUID,
) -> MarketSellerProfile:
    existing = await db.scalar(
        select(MarketSellerProfile).where(MarketSellerProfile.org_id == org_id)
    )
    if existing is not None:
        return existing

    org = await db.get(Organization, org_id)
    display = (org.name if org is not None else None) or 'Магазин'
    profile = MarketSellerProfile(
        id=uuid4(),
        org_id=org_id,
        display_name=display[:200],
        is_verified=False,
        is_active=True,
    )
    db.add(profile)
    await db.flush()
    return profile


async def find_active_import(
    db: AsyncSession,
    org_id: UUID,
    source_type: str,
    source_id: UUID,
) -> MarketListing | None:
    return await db.scalar(
        select(MarketListing).where(
            MarketListing.org_id == org_id,
            MarketListing.source_type == source_type,
            MarketListing.source_id == source_id,
            MarketListing.status.in_(_ACTIVE_IMPORT_STATUSES),
        )
    )


async def create_listing_from_source(
    db: AsyncSession,
    org_id: UUID,
    *,
    source_type: str,
    source_id: UUID,
) -> MarketListing:
    """Create draft listing from inventory/shipment SELECT snapshot (no warehouse writes)."""
    existing = await find_active_import(db, org_id, source_type, source_id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                'message': (
                    'Объявление по этому источнику уже есть '
                    f'(статус «{existing.status}»). Откройте существующий черновик '
                    'или архивируйте его перед повторным импортом.'
                ),
                'listing_id': str(existing.id),
                'status': existing.status,
            },
        )

    profile = await get_or_create_seller_profile(db, org_id)

    if source_type == 'inventory':
        item = await db.scalar(
            select(InventoryItem).where(
                InventoryItem.id == source_id,
                InventoryItem.org_id == org_id,
            )
        )
        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Позиция склада не найдена',
            )
        # Snapshot only — quantity_available is frozen at import time (MVP).
        title = item.name
        unit = item.unit
        quantity = Decimal(str(item.current_stock))
        description = (
            f'Импорт со склада (snapshot). Категория ТМЦ: {item.category}. '
            'Остаток на витрине не синхронизируется со складом автоматически.'
        )
        # Optional mapping — never mutates inventory_items; seller may override.
        mapped_category_id = await resolve_market_category_id(db, item.category)
    elif source_type == 'shipment':
        row = await db.scalar(
            select(Shipment).where(
                Shipment.id == source_id,
                Shipment.org_id == org_id,
            )
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Отгрузка урожая не найдена',
            )
        title = row.crop_type
        unit = 'кг'
        quantity = Decimal(str(row.quantity_kg))
        bits = [f'Импорт из отгрузки урожая от {row.date.isoformat()}.']
        if row.destination:
            bits.append(f'Направление: {row.destination}.')
        bits.append(
            'Количество на витрине — snapshot; KPI-отгрузки не списываются.'
        )
        description = ' '.join(bits)
        mapped_category_id = None
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="source_type должен быть 'inventory' или 'shipment'",
        )

    listing = MarketListing(
        id=uuid4(),
        org_id=org_id,
        seller_profile_id=profile.id,
        category_id=mapped_category_id,
        title=title[:200],
        description=description,
        price=Decimal('0'),
        unit=unit[:40],
        quantity_available=quantity,
        photos=[],
        status='draft',
        source_type=source_type,
        source_id=source_id,
    )
    db.add(listing)
    await db.flush()
    return listing
