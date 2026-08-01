"""Resolve display quantity for marketplace listings.

ADR (minimal live sync):
1. Warehouse / shipment row remains source of truth for stock of source-linked listings.
2. ``market_listings.quantity_available`` stays a stored snapshot (import seed / manual edits).
3. API responses expose **effective** ``quantity_available``:
   - ``quantity_mode='manual'`` → stored column;
   - ``quantity_mode='source'`` → live SELECT from inventory/shipment (read-only).
4. No UPDATE/INSERT on inventory_items or shipments from marketplace paths.
5. No reservation / write-off on market_orders.
6. Re-import 409 for active source links is unchanged.
7. Source missing/inactive → effective qty 0 + ``source_missing=true``; listing status unchanged.
8. PATCH quantity on source-linked listings is rejected (avoid second stock truth).
9. Unit/title stay seller-owned on the listing (only quantity is live for source links).
10. Deferred: reservation, checkout, stock holds, auto-unpublish at zero.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryItem
from app.models.marketplace import MarketListing
from app.models.shipment import Shipment

SOURCE_LINKED_TYPES = frozenset({'inventory', 'shipment'})


@dataclass(frozen=True, slots=True)
class ResolvedQuantity:
    quantity_available: Decimal
    quantity_mode: str  # 'manual' | 'source'
    source_missing: bool


def is_source_linked(listing: MarketListing) -> bool:
    return (
        listing.source_type in SOURCE_LINKED_TYPES
        and listing.source_id is not None
    )


def _manual_qty(listing: MarketListing) -> ResolvedQuantity:
    return ResolvedQuantity(
        quantity_available=Decimal(str(listing.quantity_available or 0)),
        quantity_mode='manual',
        source_missing=False,
    )


async def resolve_listing_quantity(
    db: AsyncSession,
    listing: MarketListing,
) -> ResolvedQuantity:
    """Single-listing resolve (detail / order / submit). Prefer batch for lists."""
    resolved = await resolve_listing_quantities(db, [listing])
    return resolved[listing.id]


async def resolve_listing_quantities(
    db: AsyncSession,
    listings: list[MarketListing],
) -> dict[UUID, ResolvedQuantity]:
    """Batch-resolve effective quantities (two SELECTs max for inventory + shipment)."""
    out: dict[UUID, ResolvedQuantity] = {}
    inv_ids: set[UUID] = set()
    ship_ids: set[UUID] = set()

    for listing in listings:
        if not is_source_linked(listing):
            out[listing.id] = _manual_qty(listing)
            continue
        if listing.source_type == 'inventory':
            inv_ids.add(listing.source_id)  # type: ignore[arg-type]
        elif listing.source_type == 'shipment':
            ship_ids.add(listing.source_id)  # type: ignore[arg-type]

    inv_map: dict[UUID, InventoryItem] = {}
    if inv_ids:
        rows = (
            await db.execute(select(InventoryItem).where(InventoryItem.id.in_(inv_ids)))
        ).scalars().all()
        inv_map = {row.id: row for row in rows}

    ship_map: dict[UUID, Shipment] = {}
    if ship_ids:
        rows = (
            await db.execute(select(Shipment).where(Shipment.id.in_(ship_ids)))
        ).scalars().all()
        ship_map = {row.id: row for row in rows}

    for listing in listings:
        if listing.id in out:
            continue
        assert listing.source_id is not None
        if listing.source_type == 'inventory':
            item = inv_map.get(listing.source_id)
            # Active warehouse row only; inactive/missing → 0 + missing flag.
            if item is None or item.org_id != listing.org_id or not item.is_active:
                out[listing.id] = ResolvedQuantity(
                    quantity_available=Decimal('0'),
                    quantity_mode='source',
                    source_missing=True,
                )
            else:
                stock = Decimal(str(item.current_stock or 0))
                if stock < 0:
                    stock = Decimal('0')
                out[listing.id] = ResolvedQuantity(
                    quantity_available=stock,
                    quantity_mode='source',
                    source_missing=False,
                )
        elif listing.source_type == 'shipment':
            row = ship_map.get(listing.source_id)
            if row is None or row.org_id != listing.org_id:
                out[listing.id] = ResolvedQuantity(
                    quantity_available=Decimal('0'),
                    quantity_mode='source',
                    source_missing=True,
                )
            else:
                qty = Decimal(str(row.quantity_kg or 0))
                if qty < 0:
                    qty = Decimal('0')
                out[listing.id] = ResolvedQuantity(
                    quantity_available=qty,
                    quantity_mode='source',
                    source_missing=False,
                )
        else:
            out[listing.id] = _manual_qty(listing)

    return out
