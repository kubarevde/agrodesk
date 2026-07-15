from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee, EmployeeRole
from app.models.equipment_log import EquipmentMeterLog
from app.models.notification import Notification
from app.models.reference import Equipment
from app.models.shift import Shift

METER_LABELS = {
    'motohours': 'мч',
    'km': 'км',
    'shift_hours': 'ч',
}


def calc_meter_label(meter_type: str | None) -> str:
    return METER_LABELS.get(meter_type or 'motohours', 'мч')


def calc_to_status(current_meter: float | None, next_to_at: float | None) -> str:
    """Backward-compatible wrapper — prefer app.services.maintenance."""
    from app.services.maintenance import calculate_to_status

    return calculate_to_status(current_meter, next_to_at)


async def add_equipment_meter_log(
    db: AsyncSession,
    *,
    equipment_id: UUID,
    value_added: Decimal | float,
    log_date: date | None = None,
    note: str | None = None,
    shift_id: UUID | None = None,
    created_by: UUID | None = None,
) -> EquipmentMeterLog:
    equipment = await db.get(Equipment, equipment_id)
    if equipment is None:
        raise ValueError('Техника не найдена')

    added = Decimal(str(value_added))
    if added <= 0:
        raise ValueError('value_added must be > 0')

    current = Decimal(str(equipment.current_meter or 0))
    meter_after = current + added
    equipment.current_meter = meter_after
    if equipment.to_interval is not None and float(equipment.to_interval) > 0:
        from app.services.maintenance import calculate_next_service_hours

        nxt = calculate_next_service_hours(float(meter_after), float(equipment.to_interval))
        if nxt is not None:
            equipment.next_to_at = Decimal(str(nxt))

    log = EquipmentMeterLog(
        equipment_id=equipment.id,
        shift_id=shift_id,
        date=log_date or date.today(),
        value_added=added,
        meter_after=meter_after,
        note=note,
        created_by=created_by,
    )
    db.add(equipment)
    db.add(log)

    await _create_to_notifications(db, equipment, meter_after)
    await db.flush()
    await db.refresh(log)
    return log


async def _create_to_notifications(
    db: AsyncSession,
    equipment: Equipment,
    current_meter: Decimal,
) -> None:
    if equipment.next_to_at is None:
        return

    next_to = Decimal(str(equipment.next_to_at))
    if next_to <= 0:
        return

    label = calc_meter_label(equipment.meter_type)
    link = f'/equipment/{equipment.id}'
    current_f = float(current_meter)
    next_f = float(next_to)

    if current_meter >= next_to:
        notif_type = 'to_overdue'
        title = f'ТО просрочено: {equipment.name}'
        body = f'Показатель {current_f:g} {label} превысил плановый {next_f:g} {label}'
    elif current_meter >= next_to * Decimal('0.9'):
        notif_type = 'to_due'
        title = f'ТО скоро: {equipment.name}'
        body = (
            f'Показатель {current_f:g} {label} приближается к плановому {next_f:g} {label}'
        )
    else:
        return

    result = await db.execute(
        select(Employee).where(
            Employee.role.in_([EmployeeRole.admin, EmployeeRole.manager]),
            Employee.is_active.is_(True),
        )
    )
    for employee in result.scalars().all():
        db.add(
            Notification(
                employee_id=employee.id,
                type=notif_type,
                title=title,
                body=body,
                link=link,
            )
        )


async def recalculate_equipment_meter(db: AsyncSession, equipment_id: UUID) -> Decimal:
    result = await db.execute(
        select(func.coalesce(func.sum(EquipmentMeterLog.value_added), 0)).where(
            EquipmentMeterLog.equipment_id == equipment_id
        )
    )
    total = Decimal(str(result.scalar_one()))
    equipment = await db.get(Equipment, equipment_id)
    if equipment is not None:
        equipment.current_meter = total
        db.add(equipment)
    return total


def meter_log_to_response(log: EquipmentMeterLog) -> dict:
    equipment = log.equipment
    shift = log.shift
    source = 'shift' if log.shift_id is not None else 'manual'
    shift_label = None
    if shift is not None and shift.employee is not None:
        shift_label = (
            f'Смена {shift.date.strftime("%d.%m.%Y")} {shift.employee.full_name}'
        )

    created_by_name = None
    if log.created_by_user is not None:
        created_by_name = log.created_by_user.full_name

    return {
        'id': log.id,
        'equipment_id': log.equipment_id,
        'equipment_name': equipment.name if equipment else '',
        'shift_id': log.shift_id,
        'shift_label': shift_label,
        'date': log.date,
        'value_added': float(log.value_added),
        'meter_after': float(log.meter_after),
        'meter_label': calc_meter_label(equipment.meter_type if equipment else None),
        'source': source,
        'note': log.note,
        'created_by_name': created_by_name,
    }


def meter_log_load_options():
    return (
        selectinload(EquipmentMeterLog.equipment),
        selectinload(EquipmentMeterLog.shift).selectinload(Shift.employee),
        selectinload(EquipmentMeterLog.created_by_user),
    )
