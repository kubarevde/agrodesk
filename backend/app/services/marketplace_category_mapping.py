"""Map inventory dictionary codes → market_categories (separate tables).

Does not modify inventory_items or org_dictionaries — read-only lookup at import.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketplace import MarketCategory, MarketCategoryMapping
from app.schemas.marketplace import (
    AdminCategoryMappingItem,
    AdminCategoryMappingUpsert,
)


def normalize_inventory_category_value(value: str) -> str:
    return (value or '').strip()


async def resolve_market_category_id(
    db: AsyncSession,
    inventory_category_value: str | None,
) -> UUID | None:
    """Return market_category_id for an inventory code, or None if unmapped."""
    value = normalize_inventory_category_value(inventory_category_value or '')
    if not value:
        return None

    row = await db.scalar(
        select(MarketCategoryMapping).where(
            MarketCategoryMapping.inventory_category_value == value
        )
    )
    if row is None:
        row = await db.scalar(
            select(MarketCategoryMapping).where(
                func.lower(MarketCategoryMapping.inventory_category_value) == value.lower()
            )
        )
    if row is None:
        return None

    cat = await db.get(MarketCategory, row.market_category_id)
    if cat is None or not cat.is_active:
        return None
    return row.market_category_id


def mapping_to_item(
    row: MarketCategoryMapping,
    *,
    market_category_name: str | None = None,
) -> AdminCategoryMappingItem:
    return AdminCategoryMappingItem(
        id=row.id,
        inventory_category_value=row.inventory_category_value,
        market_category_id=row.market_category_id,
        market_category_name=market_category_name,
    )


async def list_mappings(db: AsyncSession) -> list[AdminCategoryMappingItem]:
    result = await db.execute(
        select(MarketCategoryMapping, MarketCategory.name)
        .outerjoin(
            MarketCategory,
            MarketCategory.id == MarketCategoryMapping.market_category_id,
        )
        .order_by(MarketCategoryMapping.inventory_category_value)
    )
    return [
        mapping_to_item(row, market_category_name=name)
        for row, name in result.all()
    ]


async def upsert_mapping(
    db: AsyncSession,
    payload: AdminCategoryMappingUpsert,
) -> AdminCategoryMappingItem:
    value = normalize_inventory_category_value(payload.inventory_category_value)
    if not value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Укажите код категории ТМЦ',
        )

    cat = await db.get(MarketCategory, payload.market_category_id)
    if cat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Категория маркетплейса не найдена',
        )

    existing = await db.scalar(
        select(MarketCategoryMapping).where(
            func.lower(MarketCategoryMapping.inventory_category_value) == value.lower()
        )
    )
    if existing is not None:
        existing.inventory_category_value = value
        existing.market_category_id = payload.market_category_id
        await db.flush()
        return mapping_to_item(existing, market_category_name=cat.name)

    row = MarketCategoryMapping(
        id=uuid4(),
        inventory_category_value=value,
        market_category_id=payload.market_category_id,
    )
    db.add(row)
    await db.flush()
    return mapping_to_item(row, market_category_name=cat.name)


async def delete_mapping(db: AsyncSession, mapping_id: UUID) -> None:
    row = await db.get(MarketCategoryMapping, mapping_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Маппинг не найден',
        )
    await db.delete(row)
    await db.flush()
