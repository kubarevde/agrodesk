from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.implement import Implement, ImplementUsageLog


async def add_implement_usage_log(
    db: AsyncSession,
    *,
    implement_id: UUID,
    value_added: Decimal | float,
    log_date: date | None = None,
    note: str | None = None,
    created_by: UUID | None = None,
) -> ImplementUsageLog:
    item = await db.get(Implement, implement_id)
    if item is None:
        raise ValueError('Приспособление не найдено')

    added = Decimal(str(value_added))
    if added <= 0:
        raise ValueError('value_added must be > 0')

    current = Decimal(str(item.current_usage_hours or 0))
    meter_after = current + added
    item.current_usage_hours = meter_after

    if item.next_service_hours is None and item.service_interval_hours is not None:
        from app.services.maintenance import resolve_next_to_at

        nxt = resolve_next_to_at(
            meter_at=float(meter_after),
            next_to_interval=float(item.service_interval_hours),
        )
        if nxt is not None:
            item.next_service_hours = Decimal(str(nxt))

    log = ImplementUsageLog(
        implement_id=item.id,
        date=log_date or date.today(),
        value_added=added,
        meter_after=meter_after,
        note=note,
        created_by=created_by,
    )
    db.add(item)
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def recalculate_implement_usage(db: AsyncSession, implement_id: UUID) -> Decimal:
    result = await db.execute(
        select(func.coalesce(func.sum(ImplementUsageLog.value_added), 0)).where(
            ImplementUsageLog.implement_id == implement_id
        )
    )
    total = Decimal(str(result.scalar_one()))
    item = await db.get(Implement, implement_id)
    if item is not None:
        item.current_usage_hours = total
        db.add(item)
    return total


def usage_log_to_response(log: ImplementUsageLog) -> dict:
    implement = log.implement
    created_by_name = None
    if log.created_by_user is not None:
        created_by_name = log.created_by_user.full_name

    return {
        'id': log.id,
        'implement_id': log.implement_id,
        'implement_name': implement.name if implement else '',
        'date': log.date,
        'value_added': float(log.value_added),
        'meter_after': float(log.meter_after),
        'meter_label': 'ч',
        'source': 'manual',
        'note': log.note,
        'created_by_name': created_by_name,
        'shift_id': None,
        'shift_label': None,
    }


def usage_log_load_options():
    return (
        selectinload(ImplementUsageLog.implement),
        selectinload(ImplementUsageLog.created_by_user),
    )
