from datetime import date
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.employee_rate import EmployeeRate
from app.models.piecework_record import PieceworkRecord
from app.models.shift import Shift

PaymentScheme = Literal['hourly', 'per_shift', 'monthly', 'piecework']

# Minimal piecework UOM list (no shared inventory unit dictionary in the project).
PIECEWORK_UNITS: frozenset[str] = frozenset({'га', 'т', 'кг', 'шт', 'л', 'м²'})

SOURCE_LABELS = {
    'work_type_specific': 'По типу',
    'employee_base': 'Базовая',
    'fallback_hourly_rate': 'Старый тариф',
    'monthly_scheme': 'Оклад',
    'per_shift': 'За смену',
    'piecework': 'Сдельная',
}

# Schemes where shift.calculated_amount is intentionally unset (not zero).
SHIFT_AMOUNT_N_A_SCHEMES = frozenset({'monthly', 'piecework'})
SHIFT_AMOUNT_N_A_SOURCES = frozenset({'monthly_scheme'})


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


def resolve_payment_scheme(rate_obj: EmployeeRate | None) -> PaymentScheme:
    if rate_obj is None:
        return 'hourly'
    scheme = getattr(rate_obj, 'payment_scheme', None) or 'hourly'
    if scheme in ('hourly', 'per_shift', 'monthly', 'piecework'):
        return scheme  # type: ignore[return-value]
    return 'hourly'


def calculate_amount(
    hours: float,
    rate_obj: EmployeeRate | Any | None,
    fallback_rate: float,
) -> dict[str, float]:
    """Compute regular + overtime pay for a shift duration (hourly scheme only)."""
    def _to_float(value: Any, default: float) -> float:
        # Protect against legacy/inconsistent rows with nullable numeric columns.
        if value is None:
            return float(default)
        try:
            return float(value)
        except (TypeError, ValueError):
            return float(default)

    rate = _to_float(getattr(rate_obj, 'rate', None) if rate_obj is not None else None, fallback_rate)
    threshold = _to_float(
        getattr(rate_obj, 'overtime_threshold_hours', None) if rate_obj is not None else None,
        8.0,
    )
    multiplier = _to_float(
        getattr(rate_obj, 'overtime_multiplier', None) if rate_obj is not None else None,
        1.0,
    )

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


async def apply_salary_to_shift(db: AsyncSession, shift: Shift) -> dict[str, Any]:
    """Fill calculated_amount and rate_snapshot on a closed shift.

    hourly — existing formula (unchanged).
    per_shift — fixed rate per closed shift (ignores duration/overtime).
    monthly — amount not computed per shift; payroll run prorates later.
    piecework — amount lives on piecework_records; shift amount left unset.
    """
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
    scheme = resolve_payment_scheme(rate_obj)

    if scheme == 'per_shift' and rate_obj is not None:
        rate = float(rate_obj.rate)
        total = round(rate, 2)
        shift.calculated_amount = Decimal(str(total))
        snap = {
            'rate': rate,
            'total': total,
            'payment_scheme': 'per_shift',
            'source': source,
        }
        shift.rate_snapshot = snap
        return snap

    if scheme == 'monthly' and rate_obj is not None:
        rate = float(rate_obj.rate)
        snap = {
            'rate': rate,
            'payment_scheme': 'monthly',
            'source': 'monthly_scheme',
            'rate_source': source,
        }
        shift.calculated_amount = None
        shift.rate_snapshot = snap
        return snap

    if scheme == 'piecework' and rate_obj is not None:
        rate = float(rate_obj.rate)
        unit = rate_obj.piecework_unit
        snap = {
            'rate': rate,
            'payment_scheme': 'piecework',
            'piecework_unit': unit,
            'source': source,
        }
        shift.calculated_amount = None
        shift.rate_snapshot = snap
        return snap

    # hourly (explicit) or legacy fallback when no rate row
    calc = calculate_amount(hours, rate_obj, fallback)
    shift.calculated_amount = Decimal(str(calc['total']))
    shift.rate_snapshot = {**calc, 'payment_scheme': 'hourly', 'source': source}
    return calc


def create_piecework_record(
    *,
    org_id: UUID,
    employee_id: UUID,
    work_type_id: UUID,
    quantity: Decimal,
    unit: str,
    work_date: date,
    rate_applied: Decimal,
    created_by: UUID | None,
    shift_id: UUID | None = None,
) -> PieceworkRecord:
    """Build a PieceworkRecord (caller adds/flushes)."""
    amount = (quantity * rate_applied).quantize(Decimal('0.01'))
    return PieceworkRecord(
        org_id=org_id,
        employee_id=employee_id,
        shift_id=shift_id,
        work_type_id=work_type_id,
        quantity=quantity,
        unit=unit,
        date=work_date,
        rate_applied=rate_applied,
        calculated_amount=amount,
        created_by=created_by,
    )


def source_label(source: str | None) -> str:
    if not source:
        return SOURCE_LABELS['fallback_hourly_rate']
    return SOURCE_LABELS.get(source, source)


def shift_pay_is_applicable(shift: Shift) -> bool:
    """False when amount is intentionally N/A (monthly/piecework), not a missing hourly rate."""
    if shift.calculated_amount is not None:
        return True
    snap = shift.rate_snapshot if isinstance(shift.rate_snapshot, dict) else {}
    source = snap.get('source')
    scheme = snap.get('payment_scheme')
    if source in SHIFT_AMOUNT_N_A_SOURCES:
        return False
    if scheme in SHIFT_AMOUNT_N_A_SCHEMES:
        return False
    return True


def shift_pay_amount(shift: Shift, hours: float | None = None) -> float:
    if shift.calculated_amount is not None:
        return float(shift.calculated_amount)
    # Monthly / piecework: do not fall back to hours × hourly_rate (would distort aggregates).
    if not shift_pay_is_applicable(shift):
        return 0.0
    hrs = hours if hours is not None else float(shift.duration_rounded or 0)
    rate = float(shift.employee.hourly_rate or 0) if shift.employee is not None else 0.0
    return round(hrs * rate, 2)


def shift_source_label(shift: Shift) -> str:
    snap = shift.rate_snapshot if isinstance(shift.rate_snapshot, dict) else {}
    source = snap.get('source')
    scheme = snap.get('payment_scheme')
    if source == 'monthly_scheme' or scheme == 'monthly':
        return SOURCE_LABELS['monthly_scheme']
    if scheme == 'per_shift':
        return SOURCE_LABELS['per_shift']
    if scheme == 'piecework':
        return SOURCE_LABELS['piecework']
    if shift.calculated_amount is None and not source:
        return SOURCE_LABELS['fallback_hourly_rate']
    return source_label(str(source) if source else None)
