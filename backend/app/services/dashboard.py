import asyncio
import time
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models.expense import Expense
from app.models.inventory import InventoryItem
from app.models.shift import Shift, ShiftStatus
from app.models.shipment import Shipment
from app.schemas.dashboard import (
    DashboardActiveShift,
    DashboardCriticalItem,
    DashboardStatsResponse,
    DashboardWeeklyHours,
)
from app.services.shifts import calc_duration_from_datetimes, combine_date_time

DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

_cache: dict[str, object] = {'data': None, 'expires_at': 0.0}


def clear_dashboard_cache() -> None:
    _cache['data'] = None
    _cache['expires_at'] = 0.0


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
) -> tuple[int, list[DashboardActiveShift], float, int, float, list[DashboardWeeklyHours]]:
    async with AsyncSessionLocal() as db:
        month_result = await db.execute(
            select(Shift)
            .options(selectinload(Shift.employee), selectinload(Shift.location))
            .where(Shift.date >= month_start, Shift.date <= month_end)
        )
        month_shifts = month_result.scalars().all()

    active_shifts: list[DashboardActiveShift] = []
    today_shifts: list[Shift] = []
    weekly_map: dict[date, list[Shift]] = {}

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
    )


async def fetch_shipment_stats(month_start: date, month_end: date) -> tuple[float, float]:
    async with AsyncSessionLocal() as db:
        kg_total = await db.scalar(
            select(func.coalesce(func.sum(Shipment.quantity_kg), 0)).where(
                Shipment.date >= month_start,
                Shipment.date <= month_end,
            )
        )
        sum_total = await db.scalar(
            select(func.coalesce(func.sum(Shipment.quantity_kg * Shipment.price_per_kg), 0)).where(
                Shipment.date >= month_start,
                Shipment.date <= month_end,
                Shipment.price_per_kg.is_not(None),
            )
        )
    return float(kg_total or 0), float(sum_total or 0)


async def fetch_expense_stats(month_start: date, month_end: date) -> float:
    async with AsyncSessionLocal() as db:
        total = await db.scalar(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(
                Expense.date >= month_start,
                Expense.date <= month_end,
            )
        )
    return float(total or 0)


async def fetch_critical_inventory() -> tuple[int, list[DashboardCriticalItem]]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(InventoryItem)
            .where(
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


async def compute_stats() -> DashboardStatsResponse:
    today = date.today()
    now = datetime.now()
    month_start, month_end = month_range(today)
    week_start, week_end = week_range(today)

    shift_stats, shipment_stats, month_expenses_sum, critical_result = await asyncio.gather(
        fetch_shift_stats(today, month_start, month_end, week_start, week_end, now),
        fetch_shipment_stats(month_start, month_end),
        fetch_expense_stats(month_start, month_end),
        fetch_critical_inventory(),
    )

    (
        active_shifts_count,
        active_shifts,
        today_hours,
        month_shifts_count,
        month_hours,
        weekly_hours,
    ) = shift_stats
    month_shipments_kg, month_shipments_sum = shipment_stats
    critical_inventory_count, critical_inventory = critical_result

    return DashboardStatsResponse(
        active_shifts_count=active_shifts_count,
        active_shifts=active_shifts,
        today_hours=today_hours,
        month_shifts_count=month_shifts_count,
        month_hours=month_hours,
        month_shipments_kg=month_shipments_kg,
        month_shipments_sum=month_shipments_sum,
        month_expenses_sum=month_expenses_sum,
        critical_inventory_count=critical_inventory_count,
        critical_inventory=critical_inventory,
        weekly_hours=weekly_hours,
    )


async def get_dashboard_stats() -> DashboardStatsResponse:
    now = time.time()
    cached = _cache.get('data')
    expires_at = _cache.get('expires_at', 0.0)
    if cached is not None and now < float(expires_at):
        return cached  # type: ignore[return-value]

    data = await compute_stats()
    _cache['data'] = data
    _cache['expires_at'] = now + 30
    return data
