"""Usage checks for crop varieties."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crop_variety import CropVariety
from app.models.field_planting import FieldPlanting


async def crop_variety_usage_breakdown(
    db: AsyncSession,
    *,
    org_id: UUID,
    variety: CropVariety,
) -> dict[str, int]:
    """Counts of variety references by domain."""
    plantings = await db.scalar(
        select(func.count())
        .select_from(FieldPlanting)
        .where(
            FieldPlanting.org_id == org_id,
            FieldPlanting.variety_id == variety.id,
            FieldPlanting.status != 'cancelled',
        )
    )
    return {
        'fields': int(plantings or 0),
        'inventory': 0,
        'shipments': 0,
        'shipment_requests': 0,
    }


def format_crop_variety_usage_detail(name: str, breakdown: dict[str, int]) -> str:
    parts: list[str] = []
    if breakdown.get('fields'):
        parts.append(f"посевы на полях: {breakdown['fields']}")
    if breakdown.get('inventory'):
        parts.append(f"склад (урожай): {breakdown['inventory']}")
    if breakdown.get('shipments'):
        parts.append(f"отгрузки: {breakdown['shipments']}")
    if breakdown.get('shipment_requests'):
        parts.append(f"заявки на отгрузку: {breakdown['shipment_requests']}")
    used = sum(breakdown.values())
    where = ', '.join(parts) if parts else 'связанных записях'
    return (
        f'Нельзя деактивировать «{name}»: используется в {used} записях ({where}). '
        'Сначала смените значение у связанных сущностей или оставьте сорт активным для истории.'
    )
