"""Usage checks before soft-deactivating org dictionary rows."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dictionary import OrgDictionary
from app.models.expense import Expense
from app.models.implement import Implement
from app.models.inventory import InventoryItem
from app.models.reference import Location
from app.models.shipment import Shipment


async def crop_usage_breakdown(
    db: AsyncSession,
    *,
    org_id: UUID,
    item: OrgDictionary,
) -> dict[str, int]:
    """Counts of crop references by domain (fields / shipments / harvest SKUs)."""
    fields = await db.scalar(
        select(func.count())
        .select_from(Location)
        .where(
            Location.org_id == org_id,
            Location.kind == 'field',
            or_(
                Location.crop_type == item.name,
                Location.crop_type == item.code,
                Location.crop_code == item.code,
            ),
        )
    )
    shipments = await db.scalar(
        select(func.count())
        .select_from(Shipment)
        .where(
            Shipment.org_id == org_id,
            or_(
                Shipment.crop_type == item.name,
                Shipment.crop_type == item.code,
                Shipment.crop_code == item.code,
            ),
        )
    )
    inventory = await db.scalar(
        select(func.count())
        .select_from(InventoryItem)
        .where(
            InventoryItem.org_id == org_id,
            InventoryItem.crop_code == item.code,
        )
    )
    return {
        'fields': int(fields or 0),
        'shipments': int(shipments or 0),
        'inventory': int(inventory or 0),
    }


def format_crop_usage_detail(name: str, breakdown: dict[str, int]) -> str:
    parts: list[str] = []
    if breakdown.get('fields'):
        parts.append(f"поля: {breakdown['fields']}")
    if breakdown.get('shipments'):
        parts.append(f"отгрузки: {breakdown['shipments']}")
    if breakdown.get('inventory'):
        parts.append(f"склад (урожай): {breakdown['inventory']}")
    used = sum(breakdown.values())
    where = ', '.join(parts) if parts else 'связанных записях'
    return (
        f'Нельзя деактивировать «{name}»: используется в {used} записях ({where}). '
        'Сначала смените значение у связанных сущностей или оставьте справочник активным '
        'для истории.'
    )


async def dictionary_usage_count(
    db: AsyncSession,
    *,
    org_id: UUID,
    item: OrgDictionary,
) -> int:
    """How many business rows still reference this dictionary value."""
    if item.type == 'crop':
        breakdown = await crop_usage_breakdown(db, org_id=org_id, item=item)
        return sum(breakdown.values())

    if item.type == 'implement_category':
        result = await db.scalar(
            select(func.count())
            .select_from(Implement)
            .where(
                Implement.org_id == org_id,
                or_(Implement.category == item.name, Implement.category == item.code),
            )
        )
        return int(result or 0)

    if item.type == 'inventory_category':
        result = await db.scalar(
            select(func.count())
            .select_from(InventoryItem)
            .where(
                InventoryItem.org_id == org_id,
                or_(
                    InventoryItem.category == item.code,
                    InventoryItem.category == item.name,
                ),
            )
        )
        return int(result or 0)

    if item.type == 'expense_category':
        result = await db.scalar(
            select(func.count())
            .select_from(Expense)
            .where(
                Expense.org_id == org_id,
                or_(Expense.category == item.code, Expense.category == item.name),
            )
        )
        return int(result or 0)

    return 0
