from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.employee_rate import EmployeeRate
from app.models.shift import Shift


SOURCE_LABELS = {
    'work_type_specific': 'По типу',
    'employee_base': 'Базовая',
    'fallback_hourly_rate': 'Старый тариф',
}


async def get_rate_for_shift(
    db: AsyncSession,
    employee_id: UUID,
    work_type_id: UUID | None,
    shift_date: date,
    org_id: UUID | None = None,
) -> tuple[EmployeeRate | None, str]:
    """Resolve pay rate for a shift by priority: work-type specific → employee base → fallback."""

    def _active_period():
        return and_(
            EmployeeRate.valid_from <= shift_date,
            or_(
                EmployeeRate.valid_to.is_(None),
                EmployeeRate.valid_to >= shift_date,
            ),
        )

    org_filter = () if org_id is None else (EmployeeRate.org_id == org_id,)

    if work_type_id is not None:
        specific = await db.execute(
            select(EmployeeRate)
            .where(
                *org_filter,
                EmployeeRate.employee_id == employee_id,
                EmployeeRate.work_type_id == work_type_id,
                _active_period(),
            )
            .order_by(EmployeeRate.valid_from.desc())
            .limit(1)
        )
        rate_obj = specific.scalar_one_or_none()
        if rate_obj is not None:
            return rate_obj, 'work_type_specific'

    base = await db.execute(
        select(EmployeeRate)
        .where(
            *org_filter,
            EmployeeRate.employee_id == employee_id,
            EmployeeRate.work_type_id.is_(None),
            _active_period(),
        )
        .order_by(EmployeeRate.valid_from.desc())
        .limit(1)
    )
    rate_obj = base.scalar_one_or_none()
    if rate_obj is not None:
        return rate_obj, 'employee_base'

    return None, 'fallback_hourly_rate'


def calculate_amount(
    hours: float,
    rate_obj: EmployeeRate | Any | None,
    fallback_rate: float,
) -> dict[str, float]:
    """Compute regular + overtime pay for a shift duration."""
    rate = float(rate_obj.rate) if rate_obj is not None else float(fallback_rate)
    threshold = float(rate_obj.overtime_threshold_hours) if rate_obj is not None else 8.0
    multiplier = float(rate_obj.overtime_multiplier) if rate_obj is not None else 1.0

    regular_h = min(hours, threshold)
    overtime_h = max(0.0, hours - threshold)
    regular_sum = round(regular_h * rate, 2)
    overtime_sum = round(overtime_h * rate * multiplier, 2)

    return {
        'rate': rate,
        'multiplier': multiplier,
        'threshold': threshold,
        'regular_h': regular_h,
        'overtime_h': overtime_h,
        'regular_sum': regular_sum,
        'overtime_sum': overtime_sum,
        'total': round(regular_sum + overtime_sum, 2),
    }


async def apply_salary_to_shift(db: AsyncSession, shift: Shift) -> dict[str, float]:
    """Fill calculated_amount and rate_snapshot on a closed shift."""
    # Always load explicitly — relationship access can trigger sync lazy-load in async.
    employee = await db.get(Employee, shift.employee_id)
    fallback = float(employee.hourly_rate or 0) if employee is not None else 0.0
    hours = float(shift.duration_rounded or 0)
    rate_obj, source = await get_rate_for_shift(
        db,
        shift.employee_id,
        shift.work_type_id,
        shift.date,
        org_id=shift.org_id,
    )
    calc = calculate_amount(hours, rate_obj, fallback)
    shift.calculated_amount = Decimal(str(calc['total']))
    shift.rate_snapshot = {**calc, 'source': source}
    return calc


def source_label(source: str | None) -> str:
    if not source:
        return SOURCE_LABELS['fallback_hourly_rate']
    return SOURCE_LABELS.get(source, source)


def shift_pay_amount(shift: Shift, hours: float | None = None) -> float:
    if shift.calculated_amount is not None:
        return float(shift.calculated_amount)
    hrs = hours if hours is not None else float(shift.duration_rounded or 0)
    rate = float(shift.employee.hourly_rate or 0) if shift.employee is not None else 0.0
    return round(hrs * rate, 2)


def shift_source_label(shift: Shift) -> str:
    snap = shift.rate_snapshot if isinstance(shift.rate_snapshot, dict) else {}
    source = snap.get('source')
    if shift.calculated_amount is None and not source:
        return SOURCE_LABELS['fallback_hourly_rate']
    return source_label(str(source) if source else None)
