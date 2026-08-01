"""Seller cabinet — org-scoped listing/order management (marketplace.manage).

Uses the same JWT + OrgContextMiddleware as the rest of the private API.
Listings/orders are always filtered by the caller's org_id.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketplace import MarketCategory, MarketListing, MarketOrder, MarketSellerProfile
from app.models.organization import Organization
from app.schemas.marketplace import (
    MarketListingCreate,
    MarketListingListResponse,
    MarketListingResponse,
    MarketListingUpdate,
    SellerOrderResponse,
    SellerProfileResponse,
    SellerProfileUpdate,
)
from app.services.marketplace_import import (
    get_or_create_seller_profile,
    listing_to_response_async,
    listings_to_response,
)
from app.services.marketplace_media import (
    normalize_listing_photos,
    normalize_marketplace_logo,
)
from app.services.marketplace_quantity import is_source_linked, resolve_listing_quantity
from app.services.org_features import marketplace_enabled

ORDER_TRANSITIONS: dict[str, frozenset[str]] = {
    'new': frozenset({'contacted', 'cancelled'}),
    'contacted': frozenset({'confirmed', 'cancelled'}),
    'confirmed': frozenset({'completed', 'cancelled'}),
    'completed': frozenset(),
    'cancelled': frozenset(),
}


def profile_to_response(row: MarketSellerProfile) -> SellerProfileResponse:
    return SellerProfileResponse(
        id=row.id,
        org_id=row.org_id,
        display_name=row.display_name,
        description=row.description,
        logo_url=row.logo_url,
        phone=row.phone,
        is_verified=bool(row.is_verified),
        is_active=bool(row.is_active),
        created_at=row.created_at,
    )


def order_to_response(order: MarketOrder, listing_title: str) -> SellerOrderResponse:
    return SellerOrderResponse(
        id=order.id,
        listing_id=order.listing_id,
        listing_title=listing_title,
        buyer_name=order.buyer_name,
        buyer_phone=order.buyer_phone,
        buyer_comment=order.buyer_comment,
        quantity=Decimal(str(order.quantity)),
        status=order.status,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


async def require_marketplace_enabled(db: AsyncSession, org_id: UUID) -> Organization:
    org = await db.get(Organization, org_id)
    if org is None or not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Организация недоступна',
        )
    if not marketplace_enabled(org.settings):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Маркетплейс не включён для организации',
        )
    return org


async def get_seller_profile(db: AsyncSession, org_id: UUID) -> SellerProfileResponse:
    await require_marketplace_enabled(db, org_id)
    profile = await get_or_create_seller_profile(db, org_id)
    return profile_to_response(profile)


async def update_seller_profile(
    db: AsyncSession,
    org_id: UUID,
    payload: SellerProfileUpdate,
) -> SellerProfileResponse:
    await require_marketplace_enabled(db, org_id)
    profile = await get_or_create_seller_profile(db, org_id)
    data = payload.model_dump(exclude_unset=True)
    if 'logo_url' in data:
        data['logo_url'] = normalize_marketplace_logo(data['logo_url'])
    for key, value in data.items():
        setattr(profile, key, value)
    await db.flush()
    return profile_to_response(profile)


async def get_org_listing(
    db: AsyncSession,
    org_id: UUID,
    listing_id: UUID,
) -> MarketListing:
    row = await db.scalar(
        select(MarketListing).where(
            MarketListing.id == listing_id,
            MarketListing.org_id == org_id,
        )
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Объявление не найдено',
        )
    return row


async def list_org_listings(
    db: AsyncSession,
    org_id: UUID,
    *,
    status_filter: str | None,
) -> MarketListingListResponse:
    await require_marketplace_enabled(db, org_id)
    filters = [MarketListing.org_id == org_id]
    if status_filter:
        filters.append(MarketListing.status == status_filter)

    total = await db.scalar(
        select(func.count(MarketListing.id)).where(*filters)
    )
    rows = (
        await db.execute(
            select(MarketListing)
            .where(*filters)
            .order_by(MarketListing.updated_at.desc())
        )
    ).scalars().all()
    items = await listings_to_response(db, list(rows))
    return MarketListingListResponse(
        items=items,
        total=int(total or 0),
    )


async def _ensure_category(db: AsyncSession, category_id: UUID | None) -> None:
    if category_id is None:
        return
    exists = await db.scalar(
        select(MarketCategory.id).where(
            MarketCategory.id == category_id,
            MarketCategory.is_active.is_(True),
        )
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Категория не найдена',
        )


async def create_manual_listing(
    db: AsyncSession,
    org_id: UUID,
    payload: MarketListingCreate,
) -> MarketListingResponse:
    await require_marketplace_enabled(db, org_id)
    await _ensure_category(db, payload.category_id)
    profile = await get_or_create_seller_profile(db, org_id)
    photos = normalize_listing_photos(payload.photos)
    listing = MarketListing(
        id=uuid4(),
        org_id=org_id,
        seller_profile_id=profile.id,
        category_id=payload.category_id,
        title=payload.title.strip()[:200],
        description=payload.description,
        price=payload.price,
        unit=payload.unit.strip()[:40],
        quantity_available=payload.quantity_available,
        photos=photos,
        status='draft',
        source_type='manual',
        source_id=None,
    )
    db.add(listing)
    await db.flush()
    return await listing_to_response_async(db, listing)


async def update_listing(
    db: AsyncSession,
    org_id: UUID,
    listing_id: UUID,
    payload: MarketListingUpdate,
) -> MarketListingResponse:
    await require_marketplace_enabled(db, org_id)
    listing = await get_org_listing(db, org_id, listing_id)
    if listing.status == 'archived':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Архивное объявление нельзя редактировать',
        )
    data = payload.model_dump(exclude_unset=True)
    if 'quantity_available' in data and is_source_linked(listing):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                'Количество синхронизируется с источником (склад/отгрузка). '
                'Измените остаток на складе или архивируйте объявление.'
            ),
        )
    if 'category_id' in data:
        await _ensure_category(db, data['category_id'])
    if 'photos' in data and data['photos'] is not None:
        data['photos'] = normalize_listing_photos(data['photos'])
    if 'title' in data and isinstance(data['title'], str):
        data['title'] = data['title'].strip()[:200]
    if 'unit' in data and isinstance(data['unit'], str):
        data['unit'] = data['unit'].strip()[:40]
    for key, value in data.items():
        setattr(listing, key, value)
    await db.flush()
    await db.refresh(listing)
    return await listing_to_response_async(db, listing)


async def _validate_ready_for_review(db: AsyncSession, listing: MarketListing) -> None:
    errors: list[str] = []
    photos = listing.photos if isinstance(listing.photos, list) else []
    if not photos:
        errors.append('нужно хотя бы одно фото')
    if listing.category_id is None:
        errors.append('укажите категорию')
    if Decimal(str(listing.price)) <= 0:
        errors.append('цена должна быть больше 0')
    qty = await resolve_listing_quantity(db, listing)
    if qty.quantity_available <= 0:
        if qty.quantity_mode == 'source' and qty.source_missing:
            errors.append('источник остатка недоступен (склад/отгрузка)')
        else:
            errors.append('количество должно быть больше 0')
    if not (listing.title or '').strip():
        errors.append('укажите название')
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                'message': 'Объявление не готово к модерации',
                'errors': errors,
            },
        )


async def submit_listing(
    db: AsyncSession,
    org_id: UUID,
    listing_id: UUID,
) -> MarketListingResponse:
    await require_marketplace_enabled(db, org_id)
    listing = await get_org_listing(db, org_id, listing_id)
    if listing.status not in ('draft', 'rejected'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Нельзя отправить на модерацию из статуса «{listing.status}»',
        )
    await _validate_ready_for_review(db, listing)
    listing.status = 'pending_review'
    listing.rejection_reason = None
    await db.flush()
    await db.refresh(listing)
    return await listing_to_response_async(db, listing)


async def archive_listing(
    db: AsyncSession,
    org_id: UUID,
    listing_id: UUID,
) -> MarketListingResponse:
    await require_marketplace_enabled(db, org_id)
    listing = await get_org_listing(db, org_id, listing_id)
    if listing.status == 'archived':
        return await listing_to_response_async(db, listing)
    listing.status = 'archived'
    await db.flush()
    await db.refresh(listing)
    return await listing_to_response_async(db, listing)


async def list_org_orders(
    db: AsyncSession,
    org_id: UUID,
    *,
    status_filter: str | None,
) -> list[SellerOrderResponse]:
    await require_marketplace_enabled(db, org_id)
    filters = [MarketListing.org_id == org_id]
    if status_filter:
        filters.append(MarketOrder.status == status_filter)
    rows = (
        await db.execute(
            select(MarketOrder, MarketListing.title)
            .join(MarketListing, MarketListing.id == MarketOrder.listing_id)
            .where(*filters)
            .order_by(MarketOrder.created_at.desc())
        )
    ).all()
    return [order_to_response(order, title) for order, title in rows]


async def update_order_status(
    db: AsyncSession,
    org_id: UUID,
    order_id: UUID,
    new_status: str,
) -> SellerOrderResponse:
    await require_marketplace_enabled(db, org_id)
    row = (
        await db.execute(
            select(MarketOrder, MarketListing)
            .join(MarketListing, MarketListing.id == MarketOrder.listing_id)
            .where(
                MarketOrder.id == order_id,
                MarketListing.org_id == org_id,
            )
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Заявка не найдена',
        )
    order, listing = row
    allowed = ORDER_TRANSITIONS.get(order.status, frozenset())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f'Нельзя сменить статус с «{order.status}» на «{new_status}». '
                f'Допустимо: {", ".join(sorted(allowed)) or "нет"}'
            ),
        )
    listing_title = listing.title
    order.status = new_status
    await db.flush()
    await db.refresh(order)
    return order_to_response(order, listing_title)
