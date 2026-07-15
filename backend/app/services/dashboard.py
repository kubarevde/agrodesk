import asyncio
import time
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models.agro_plan import AgroPlan
from app.models.expense import Expense
from app.models.inventory import InventoryItem
from app.models.reference import Equipment, Location
from app.models.sharing import SharingListing, SharingRequest
from app.models.shift import Shift, ShiftStatus
from app.models.shipment import Shipment
from app.schemas.dashboard import (
    DashboardActiveShift,
    DashboardAgroPlanToday,
    DashboardCriticalItem,
    DashboardEquipmentWarning,
    DashboardStatsResponse,
    DashboardWeeklyHours,
)
from app.services.equipment_meters import calc_meter_label
from app.services.maintenance import calculate_to_status as calc_to_status
from app.services.shifts import calc_duration_from_datetimes, combine_date_time

DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

_cache: dict[str, object] = {'by_user': {}}


def clear_dashboard_cache() -> None:
    _cache['by_user'] = {}


def month_range(today: date) -> tuple[date, date]:
    return today.replace(day=1), today


def week_range(today: date) -> tuple[date, date]:
    monday = today - timedelta(days=today.weekday())
    return monday, monday + timedelta(days=6)


def shift_hours(shift: Shift, now: datetime) -> float:
    if shift.status == ShiftStatus.closed and shift.duration_rounded is not None:
        return float(shift.duration_rounded)

    start_dt = combine_date_time(shift.date, shift.start_time)
    minutes = calc_duration_from_datetimes(start_dt, now)
    return round(minutes / 60, 2)


async def fetch_shift_stats(
    today: date,
    month_start: date,
    month_end: date,
    week_start: date,
    week_end: date,
    now: datetime,
    org_id: UUID,
) -> tuple[
    int,
    list[DashboardActiveShift],
    float,
    int,
    float,
    list[DashboardWeeklyHours],
    float,
    int,
]:
    from app.services.salary import shift_pay_amount

    async with AsyncSessionLocal() as db:
        month_result = await db.execute(
            select(Shift)
            .options(selectinload(Shift.employee), selectinload(Shift.location))
            .where(
                Shift.org_id == org_id,
                Shift.date >= month_start,
                Shift.date <= month_end,
            )
        )
        month_shifts = month_result.scalars().all()

    active_shifts: list[DashboardActiveShift] = []
    today_shifts: list[Shift] = []
    weekly_map: dict[date, list[Shift]] = {}
    month_salary_total = 0.0
    no_rate_shifts_count = 0

    for shift in month_shifts:
        if shift.status == ShiftStatus.open:
            start_dt = combine_date_time(shift.date, shift.start_time)
            active_shifts.append(
                DashboardActiveShift(
                    id=shift.id,
                    employee_name=shift.employee.full_name,
                    location=shift.location.name,
                    start_time=shift.start_time.strftime('%H:%M:%S'),
                    duration_minutes=calc_duration_from_datetimes(start_dt, now),
                )
            )

        if shift.date == today:
            today_shifts.append(shift)

        if week_start <= shift.date <= week_end:
            weekly_map.setdefault(shift.date, []).append(shift)

        if shift.status == ShiftStatus.closed:
            hours = shift_hours(shift, now)
            month_salary_total += shift_pay_amount(shift, hours)
            snap = shift.rate_snapshot if isinstance(shift.rate_snapshot, dict) else {}
            source = snap.get('source')
            if source == 'fallback_hourly_rate' or (
                shift.calculated_amount is None and not source
            ):
                no_rate_shifts_count += 1

    active_shifts.sort(key=lambda item: item.start_time)
    today_hours = round(sum(shift_hours(shift, now) for shift in today_shifts), 2)
    month_hours = round(sum(shift_hours(shift, now) for shift in month_shifts), 2)

    weekly_hours = []
    for offset in range(7):
        day_date = week_start + timedelta(days=offset)
        day_shifts = weekly_map.get(day_date, [])
        weekly_hours.append(
            DashboardWeeklyHours(
                day=DAY_NAMES[day_date.weekday()],
                date=day_date,
                hours=round(sum(shift_hours(shift, now) for shift in day_shifts), 2),
                shifts_count=len(day_shifts),
            )
        )

    return (
        len(active_shifts),
        active_shifts,
        today_hours,
        len(month_shifts),
        month_hours,
        weekly_hours,
        round(month_salary_total, 2),
        no_rate_shifts_count,
    )


async def fetch_shipment_stats(
    month_start: date, month_end: date, org_id: UUID
) -> tuple[float, float]:
    async with AsyncSessionLocal() as db:
        kg_total = await db.scalar(
            select(func.coalesce(func.sum(Shipment.quantity_kg), 0)).where(
                Shipment.org_id == org_id,
                Shipment.date >= month_start,
                Shipment.date <= month_end,
            )
        )
        sum_total = await db.scalar(
            select(func.coalesce(func.sum(Shipment.quantity_kg * Shipment.price_per_kg), 0)).where(
                Shipment.org_id == org_id,
                Shipment.date >= month_start,
                Shipment.date <= month_end,
                Shipment.price_per_kg.is_not(None),
            )
        )
    return float(kg_total or 0), float(sum_total or 0)


async def fetch_expense_stats(month_start: date, month_end: date, org_id: UUID) -> float:
    async with AsyncSessionLocal() as db:
        total = await db.scalar(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(
                Expense.org_id == org_id,
                Expense.date >= month_start,
                Expense.date <= month_end,
            )
        )
    return float(total or 0)


async def fetch_critical_inventory(org_id: UUID) -> tuple[int, list[DashboardCriticalItem]]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(InventoryItem)
            .where(
                InventoryItem.org_id == org_id,
                InventoryItem.is_active.is_(True),
                InventoryItem.current_stock < InventoryItem.min_stock,
            )
            .order_by(InventoryItem.name)
        )
        items = result.scalars().all()

    critical = [
        DashboardCriticalItem(
            id=item.id,
            name=item.name,
            current_stock=item.current_stock,
            min_stock=item.min_stock,
            unit=item.unit,
        )
        for item in items
    ]
    return len(critical), critical


async def fetch_equipment_warnings(org_id: UUID) -> tuple[int, list[DashboardEquipmentWarning]]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Equipment)
            .where(
                Equipment.org_id == org_id,
                Equipment.is_active.is_(True),
                Equipment.next_to_at.is_not(None),
            )
            .order_by(Equipment.name)
        )
        items = result.scalars().all()

    warnings: list[DashboardEquipmentWarning] = []
    for item in items:
        current = float(item.current_meter or 0)
        next_to = float(item.next_to_at) if item.next_to_at is not None else None
        status = calc_to_status(current, next_to)
        if status not in ('warning', 'overdue'):
            continue
        warnings.append(
            DashboardEquipmentWarning(
                id=item.id,
                name=item.name,
                to_status=status,
                current_meter=current,
                next_to_at=next_to,
                meter_label=calc_meter_label(item.meter_type),
            )
        )

    warnings.sort(key=lambda item: (item.to_status != 'overdue', item.next_to_at or 0))
    return len(warnings), warnings


async def fetch_agro_plan_today(today: date, org_id: UUID) -> list[DashboardAgroPlanToday]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgroPlan)
            .join(Location, AgroPlan.location_id == Location.id)
            .options(selectinload(AgroPlan.location), selectinload(AgroPlan.work_type))
            .where(
                Location.org_id == org_id,
                AgroPlan.planned_date == today,
            )
            .order_by(AgroPlan.status.asc())
        )
        plans = result.scalars().all()

    return [
        DashboardAgroPlanToday(
            id=plan.id,
            field_name=plan.location.name if plan.location else '',
            work_type_name=plan.work_type.name if plan.work_type else '',
            status=plan.status,
        )
        for plan in plans
    ]


async def fetch_sharing_new_requests(owner_id: UUID) -> int:
    async with AsyncSessionLocal() as db:
        count = await db.scalar(
            select(func.count())
            .select_from(SharingRequest)
            .join(SharingListing, SharingRequest.listing_id == SharingListing.id)
            .where(
                SharingListing.owner_id == owner_id,
                SharingRequest.status == 'pending',
            )
        )
    return int(count or 0)


async def compute_stats(owner_id: UUID, org_id: UUID) -> DashboardStatsResponse:
    today = date.today()
    now = datetime.now()
    month_start, month_end = month_range(today)
    week_start, week_end = week_range(today)

    (
        shift_stats,
        shipment_stats,
        month_expenses_sum,
        critical_result,
        equipment_result,
        agro_plan_today,
        sharing_new_requests,
    ) = await asyncio.gather(
        fetch_shift_stats(today, month_start, month_end, week_start, week_end, now, org_id),
        fetch_shipment_stats(month_start, month_end, org_id),
        fetch_expense_stats(month_start, month_end, org_id),
        fetch_critical_inventory(org_id),
        fetch_equipment_warnings(org_id),
        fetch_agro_plan_today(today, org_id),
        fetch_sharing_new_requests(owner_id),
    )

    (
        active_shifts_count,
        active_shifts,
        today_hours,
        month_shifts_count,
        month_hours,
        weekly_hours,
        month_salary_total,
        no_rate_shifts_count,
    ) = shift_stats
    month_shipments_kg, month_shipments_sum = shipment_stats
    critical_inventory_count, critical_inventory = critical_result
    equipment_warning_count, equipment_warnings = equipment_result

    return DashboardStatsResponse(
        active_shifts_count=active_shifts_count,
        active_shifts=active_shifts,
        today_hours=today_hours,
        month_shifts_count=month_shifts_count,
        month_hours=month_hours,
        month_shipments_kg=month_shipments_kg,
        month_shipments_sum=month_shipments_sum,
        month_expenses_sum=month_expenses_sum,
        month_salary_total=month_salary_total,
        no_rate_shifts_count=no_rate_shifts_count,
        critical_inventory_count=critical_inventory_count,
        critical_inventory=critical_inventory,
        weekly_hours=weekly_hours,
        equipment_warning_count=equipment_warning_count,
        equipment_warnings=equipment_warnings,
        agro_plan_today=agro_plan_today,
        sharing_new_requests=sharing_new_requests,
    )


async def get_dashboard_stats(owner_id: UUID, org_id: UUID) -> DashboardStatsResponse:
    now = time.time()
    cache_key = f'{org_id}:{owner_id}'
    cached_map = _cache.get('by_user')
    if not isinstance(cached_map, dict):
        cached_map = {}
        _cache['by_user'] = cached_map

    entry = cached_map.get(cache_key)
    if isinstance(entry, dict):
        expires_at = float(entry.get('expires_at', 0.0))
        data = entry.get('data')
        if data is not None and now < expires_at:
            return data  # type: ignore[return-value]

    data = await compute_stats(owner_id, org_id)
    cached_map[cache_key] = {'data': data, 'expires_at': now + 30}
    _cache['by_user'] = cached_map
    return data
