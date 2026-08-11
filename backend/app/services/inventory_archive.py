"""Safe archive / restore / hard-delete for inventory items."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryItem, InventoryOperation
from app.models.marketplace import MarketListing
from app.models.purchase_planner import PurchasePlannerItem
from app.models.shipment_request import ShipmentRequest
from app.models.tmc_shipment import TmcShipment

STOCK_BLOCK_MESSAGE = (
    'Нельзя удалить или архивировать ТМЦ с остатком. Сначала оформите расход, '
    'списание или корректировку остатка, затем повторите действие'
)


@dataclass(frozen=True)
class InventoryItemLinks:
    operations: int
    shipment_requests: int
    tmc_shipments: int
    purchase_planner_items: int
    marketplace_listings: int

    @property
    def has_history(self) -> bool:
        return (
            self.operations > 0
            or self.shipment_requests > 0
            or self.tmc_shipments > 0
            or self.purchase_planner_items > 0
            or self.marketplace_listings > 0
        )

    def blocking_labels(self) -> list[str]:
        labels: list[str] = []
        if self.operations:
            labels.append(f'операции склада ({self.operations})')
        if self.shipment_requests:
            labels.append(f'заявки на отгрузку ({self.shipment_requests})')
        if self.tmc_shipments:
            labels.append(f'отгрузки ТМЦ ({self.tmc_shipments})')
        if self.purchase_planner_items:
            labels.append(f'позиции планировщика закупок ({self.purchase_planner_items})')
        if self.marketplace_listings:
            labels.append(f'объявления маркетплейса ({self.marketplace_listings})')
        return labels


async def count_item_links(db: AsyncSession, item_id: UUID) -> InventoryItemLinks:
    ops = await db.scalar(
        select(func.count()).select_from(InventoryOperation).where(
            InventoryOperation.item_id == item_id
        )
    )
    reqs = await db.scalar(
        select(func.count()).select_from(ShipmentRequest).where(
            ShipmentRequest.inventory_item_id == item_id
        )
    )
    tmcs = await db.scalar(
        select(func.count()).select_from(TmcShipment).where(
            TmcShipment.inventory_item_id == item_id
        )
    )
    purchases = await db.scalar(
        select(func.count()).select_from(PurchasePlannerItem).where(
            PurchasePlannerItem.inventory_item_id == item_id
        )
    )
    markets = await db.scalar(
        select(func.count())
        .select_from(MarketListing)
        .where(
            MarketListing.source_type == 'inventory',
            MarketListing.source_id == item_id,
        )
    )
    return InventoryItemLinks(
        operations=int(ops or 0),
        shipment_requests=int(reqs or 0),
        tmc_shipments=int(tmcs or 0),
        purchase_planner_items=int(purchases or 0),
        marketplace_listings=int(markets or 0),
    )


def stock_is_positive(item: InventoryItem) -> bool:
    return Decimal(str(item.current_stock or 0)) > 0


def assert_zero_stock(item: InventoryItem) -> None:
    if stock_is_positive(item):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=STOCK_BLOCK_MESSAGE,
        )


def can_hard_delete(item: InventoryItem, links: InventoryItemLinks) -> bool:
    return (not stock_is_positive(item)) and (not links.has_history)


async def archive_item(
    db: AsyncSession,
    *,
    item: InventoryItem,
    reason: str,
    actor_id: UUID,
) -> InventoryItem:
    assert_zero_stock(item)
    if not item.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Позиция уже в архиве',
        )
    item.is_active = False
    item.archived_at = datetime.now(timezone.utc)
    item.archived_by = actor_id
    item.archive_reason = reason.strip()
    db.add(item)
    return item


async def restore_item(
    db: AsyncSession,
    *,
    item: InventoryItem,
) -> InventoryItem:
    if item.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Позиция уже активна',
        )
    item.is_active = True
    # Keep archived_at / archived_by / archive_reason for history.
    db.add(item)
    return item


async def hard_delete_item(
    db: AsyncSession,
    *,
    item: InventoryItem,
) -> None:
    assert_zero_stock(item)
    links = await count_item_links(db, item.id)
    if links.has_history:
        joined = ', '.join(links.blocking_labels())
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f'Нельзя удалить безвозвратно: есть связанные данные ({joined}). '
                'Используйте архивирование.'
            ),
        )
    await db.delete(item)
