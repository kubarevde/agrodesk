from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class DashboardActiveShift(BaseModel):
    id: UUID
    employee_name: str
    location: str
    start_time: str
    duration_minutes: int


class DashboardCriticalItem(BaseModel):
    id: UUID
    name: str
    current_stock: Decimal
    min_stock: Decimal
    unit: str


class DashboardWeeklyHours(BaseModel):
    day: str
    date: date
    hours: float
    shifts_count: int


class DashboardStatsResponse(BaseModel):
    active_shifts_count: int
    active_shifts: list[DashboardActiveShift]
    today_hours: float
    month_shifts_count: int
    month_hours: float
    month_shipments_kg: float
    month_shipments_sum: float
    month_expenses_sum: float
    critical_inventory_count: int
    critical_inventory: list[DashboardCriticalItem]
    weekly_hours: list[DashboardWeeklyHours]
