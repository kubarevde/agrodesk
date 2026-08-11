"""Payroll run aggregation (Prompt #3).

Reads Shift.calculated_amount / piecework_records / employee_rates — never mutates them.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.employee_rate import EmployeeRate
from app.models.payroll import PayrollAdjustment, PayrollPayout, PayrollRun, PayrollRunLine
from app.models.piecework_record import PieceworkRecord
from app.models.shift import Shift, ShiftStatus
from app.services.payroll_payouts import payout_status_for_amounts, sum_payouts_for_line

ZERO = Decimal('0.00')


@dataclass(frozen=True)
class SchemeSegment:
    employee_id: UUID
    payment_scheme: str
    segment_start: date
    segment_end: date
    rate: Decimal | None


def _q(value: Decimal | float | int | None) -> Decimal:
    if value is None:
        return ZERO
    return Decimal(str(value)).quantize(Decimal('0.01'))


def period_days(period_start: date, period_end: date) -> int:
    return (period_end - period_start).days + 1


def clamp_range(start: date, end: date, lo: date, hi: date) -> tuple[date, date] | None:
    a = max(start, lo)
    b = min(end, hi)
    if a > b:
        return None
    return a, b


def overlapping_payroll_run_exists(
    existing: list[PayrollRun],
    period_start: date,
    period_end: date,
    *,
    exclude_id: UUID | None = None,
) -> bool:
    for run in existing:
        if exclude_id is not None and run.id == exclude_id:
            continue
        if run.period_start <= period_end and run.period_end >= period_start:
            return True
    return False


def build_base_scheme_segments(
    rates: list[EmployeeRate],
    period_start: date,
    period_end: date,
    employee_id: UUID,
) -> list[SchemeSegment]:
    """Split period by overlapping base rates (work_type_id IS NULL).

    Gaps without a base rate become an hourly fallback segment so closed
    shifts/piecework in that window are still aggregated.
    """
    intervals: list[tuple[date, date, str, Decimal | None]] = []
    for rate in rates:
        if rate.work_type_id is not None:
            continue
        if rate.employee_id != employee_id:
            continue
        valid_to = rate.valid_to or period_end
        clipped = clamp_range(rate.valid_from, valid_to, period_start, period_end)
        if clipped is None:
            continue
        scheme = rate.payment_scheme or 'hourly'
        intervals.append((clipped[0], clipped[1], scheme, Decimal(str(rate.rate))))

    intervals.sort(key=lambda item: item[0])

    segments: list[SchemeSegment] = []
    cursor = period_start
    for start, end, scheme, rate_value in intervals:
        if start > cursor:
            segments.append(
                SchemeSegment(
                    employee_id=employee_id,
                    payment_scheme='hourly',
                    segment_start=cursor,
                    segment_end=start - timedelta(days=1),
                    rate=None,
                )
            )
        # Merge contiguous same-scheme intervals.
        if (
            segments
            and segments[-1].payment_scheme == scheme
            and segments[-1].segment_end + timedelta(days=1) == start
            and segments[-1].rate == rate_value
        ):
            prev = segments[-1]
            segments[-1] = SchemeSegment(
                employee_id=employee_id,
                payment_scheme=scheme,
                segment_start=prev.segment_start,
                segment_end=end,
                rate=rate_value,
            )
        else:
            segments.append(
                SchemeSegment(
                    employee_id=employee_id,
                    payment_scheme=scheme,
                    segment_start=start,
                    segment_end=end,
                    rate=rate_value,
                )
            )
        cursor = end + timedelta(days=1)

    if cursor <= period_end:
        segments.append(
            SchemeSegment(
                employee_id=employee_id,
                payment_scheme='hourly',
                segment_start=cursor,
                segment_end=period_end,
                rate=None,
            )
        )

    # Drop empty/invalid (should not happen) and zero-length after merge.
    return [s for s in segments if s.segment_start <= s.segment_end]


def compute_segment_base(
    segment: SchemeSegment,
    *,
    period_start: date,
    period_end: date,
    shifts: list[Shift],
    pieceworks: list[PieceworkRecord],
) -> tuple[Decimal, dict[str, Any]]:
    days_in_period = period_days(period_start, period_end)
    seg_days = period_days(segment.segment_start, segment.segment_end)
    breakdown: dict[str, Any] = {
        'segment_start': segment.segment_start.isoformat(),
        'segment_end': segment.segment_end.isoformat(),
        'payment_scheme': segment.payment_scheme,
        'rate': float(segment.rate) if segment.rate is not None else None,
    }

    if segment.payment_scheme in ('hourly', 'per_shift'):
        matched = [
            s
            for s in shifts
            if s.employee_id == segment.employee_id
            and segment.segment_start <= s.date <= segment.segment_end
            and s.calculated_amount is not None
        ]
        total = sum((_q(s.calculated_amount) for s in matched), ZERO)
        breakdown.update(
            {
                'shifts_count': len(matched),
                'shift_ids': [str(s.id) for s in matched],
            }
        )
        return _q(total), breakdown

    if segment.payment_scheme == 'monthly':
        rate = segment.rate or ZERO
        if days_in_period <= 0:
            amount = ZERO
        else:
            amount = _q(rate * Decimal(seg_days) / Decimal(days_in_period))
        breakdown.update(
            {
                'calendar_days': seg_days,
                'period_days': days_in_period,
                'monthly_rate': float(rate),
                'formula': 'rate * segment_days / period_days',
            }
        )
        return amount, breakdown

    # piecework
    matched_pw = [
        p
        for p in pieceworks
        if p.employee_id == segment.employee_id
        and segment.segment_start <= p.date <= segment.segment_end
    ]
    total = sum((_q(p.calculated_amount) for p in matched_pw), ZERO)
    breakdown.update(
        {
            'piecework_count': len(matched_pw),
            'piecework_record_ids': [str(p.id) for p in matched_pw],
        }
    )
    return _q(total), breakdown


def adjustment_signed_total(adjustments: list[PayrollAdjustment]) -> Decimal:
    total = ZERO
    for adj in adjustments:
        total += _q(adj.amount) * Decimal(int(adj.sign))
    return _q(total)


def recompute_line_totals(line: PayrollRunLine) -> None:
    line.adjustments_total = adjustment_signed_total(list(line.adjustments or []))
    line.total_amount = _q(line.base_calculated_amount) + _q(line.adjustments_total)


def resolve_adjustment_sign(adj_type: str, sign: int | None) -> int:
    if adj_type == 'bonus':
        return 1
    if adj_type in ('penalty', 'deduction'):
        return -1
    if adj_type == 'other':
        if sign not in (-1, 1):
            raise ValueError('Для типа other укажите sign: 1 или -1')
        return sign
    raise ValueError(f'Неизвестный тип корректировки: {adj_type}')


async def assert_no_period_overlap(
    db: AsyncSession,
    *,
    org_id: UUID,
    period_start: date,
    period_end: date,
    exclude_id: UUID | None = None,
) -> None:
    result = await db.execute(select(PayrollRun).where(PayrollRun.org_id == org_id))
    runs = list(result.scalars().all())
    if overlapping_payroll_run_exists(
        runs, period_start, period_end, exclude_id=exclude_id
    ):
        raise ValueError(
            'Период начисления пересекается с существующим payroll run организации'
        )


async def load_aggregation_inputs(
    db: AsyncSession,
    *,
    org_id: UUID,
    period_start: date,
    period_end: date,
) -> tuple[list[Employee], list[EmployeeRate], list[Shift], list[PieceworkRecord]]:
    employees = list(
        (
            await db.execute(
                select(Employee).where(
                    Employee.org_id == org_id,
                    Employee.is_active.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )

    rates = list(
        (
            await db.execute(
                select(EmployeeRate).where(
                    EmployeeRate.org_id == org_id,
                    EmployeeRate.valid_from <= period_end,
                    or_(
                        EmployeeRate.valid_to.is_(None),
                        EmployeeRate.valid_to >= period_start,
                    ),
                )
            )
        )
        .scalars()
        .all()
    )

    shifts = list(
        (
            await db.execute(
                select(Shift).where(
                    Shift.org_id == org_id,
                    Shift.status == ShiftStatus.closed,
                    Shift.date >= period_start,
                    Shift.date <= period_end,
                )
            )
        )
        .scalars()
        .all()
    )

    pieceworks = list(
        (
            await db.execute(
                select(PieceworkRecord).where(
                    PieceworkRecord.org_id == org_id,
                    PieceworkRecord.date >= period_start,
                    PieceworkRecord.date <= period_end,
                )
            )
        )
        .scalars()
        .all()
    )
    return employees, rates, shifts, pieceworks


def employees_with_activity(
    employees: list[Employee],
    rates: list[EmployeeRate],
    shifts: list[Shift],
    pieceworks: list[PieceworkRecord],
) -> list[Employee]:
    active_ids = {e.id for e in employees}
    needed: set[UUID] = set()
    for s in shifts:
        if s.employee_id in active_ids:
            needed.add(s.employee_id)
    for p in pieceworks:
        if p.employee_id in active_ids:
            needed.add(p.employee_id)
    for r in rates:
        if r.work_type_id is None and r.employee_id in active_ids:
            # Monthly (and any base scheme) overlapping period → include employee.
            needed.add(r.employee_id)
    return [e for e in employees if e.id in needed]


async def build_run_lines(
    db: AsyncSession,
    *,
    org_id: UUID,
    period_start: date,
    period_end: date,
) -> list[PayrollRunLine]:
    employees, rates, shifts, pieceworks = await load_aggregation_inputs(
        db,
        org_id=org_id,
        period_start=period_start,
        period_end=period_end,
    )
    lines: list[PayrollRunLine] = []
    for employee in employees_with_activity(employees, rates, shifts, pieceworks):
        segments = build_base_scheme_segments(
            rates, period_start, period_end, employee.id
        )
        for segment in segments:
            base, breakdown = compute_segment_base(
                segment,
                period_start=period_start,
                period_end=period_end,
                shifts=shifts,
                pieceworks=pieceworks,
            )
            # Skip empty hourly/piecework/per_shift segments with zero activity,
            # but keep monthly segments (pro-rata salary even with no shifts).
            if (
                segment.payment_scheme != 'monthly'
                and base == ZERO
                and not breakdown.get('shifts_count')
                and not breakdown.get('piecework_count')
            ):
                continue
            if segment.payment_scheme == 'monthly' and (segment.rate or ZERO) == ZERO:
                continue
            line = PayrollRunLine(
                employee_id=employee.id,
                payment_scheme=segment.payment_scheme,
                base_calculated_amount=base,
                adjustments_total=ZERO,
                total_amount=base,
                source_breakdown=breakdown,
                payout_status='unpaid',
            )
            lines.append(line)
    return lines


async def populate_run_lines(
    db: AsyncSession,
    run: PayrollRun,
    *,
    preserve_adjustments: bool = False,
) -> None:
    """Replace line bases with a fresh aggregation.

    When ``preserve_adjustments`` is True (recalculate):
    - snapshots manual adjustments and linked payouts by employee;
    - rebuilds bases from shifts/piecework/rates;
    - restores adjustments onto matching new lines;
    - re-links payouts (SET NULL during line delete) to new lines.
    """
    existing = list(
        (
            await db.execute(
                select(PayrollRunLine)
                .options(selectinload(PayrollRunLine.adjustments))
                .where(PayrollRunLine.payroll_run_id == run.id)
            )
        )
        .scalars()
        .all()
    )
    old_line_ids = [line.id for line in existing]

    adj_snapshots: list[dict] = []
    payout_by_employee: dict[UUID, list[UUID]] = {}
    if preserve_adjustments:
        for line in existing:
            for adj in list(line.adjustments or []):
                adj_snapshots.append(
                    {
                        'employee_id': line.employee_id,
                        'payment_scheme': line.payment_scheme,
                        'type': adj.type,
                        'amount': adj.amount,
                        'sign': int(adj.sign),
                        'comment': adj.comment,
                        'created_by': adj.created_by,
                    }
                )
        if old_line_ids:
            payout_rows = list(
                (
                    await db.execute(
                        select(PayrollPayout).where(
                            PayrollPayout.payroll_run_line_id.in_(old_line_ids)
                        )
                    )
                )
                .scalars()
                .all()
            )
            for p in payout_rows:
                payout_by_employee.setdefault(p.employee_id, []).append(p.id)

    for line in existing:
        await db.delete(line)
    await db.flush()

    new_lines = await build_run_lines(
        db,
        org_id=run.org_id,
        period_start=run.period_start,
        period_end=run.period_end,
    )
    for line in new_lines:
        line.payroll_run_id = run.id
        db.add(line)
    await db.flush()

    if not preserve_adjustments:
        return

    by_emp_scheme: dict[tuple[UUID, str], list[PayrollRunLine]] = {}
    by_emp: dict[UUID, list[PayrollRunLine]] = {}
    for line in new_lines:
        by_emp_scheme.setdefault((line.employee_id, str(line.payment_scheme)), []).append(line)
        by_emp.setdefault(line.employee_id, []).append(line)

    def pick_line(employee_id: UUID, scheme: str | None) -> PayrollRunLine | None:
        if scheme:
            matched = by_emp_scheme.get((employee_id, scheme))
            if matched:
                return matched[0]
        rows = by_emp.get(employee_id)
        return rows[0] if rows else None

    # Employees with adjustments but no activity after rebuild → keep a zero base line.
    for snap in adj_snapshots:
        emp_id = snap['employee_id']
        if emp_id not in by_emp:
            orphan = PayrollRunLine(
                payroll_run_id=run.id,
                employee_id=emp_id,
                payment_scheme=snap['payment_scheme'] or 'hourly',
                base_calculated_amount=ZERO,
                adjustments_total=ZERO,
                total_amount=ZERO,
                source_breakdown={'note': 'line_kept_for_manual_adjustments'},
                payout_status='unpaid',
            )
            db.add(orphan)
            new_lines.append(orphan)
            by_emp[emp_id] = [orphan]
            by_emp_scheme.setdefault((emp_id, str(orphan.payment_scheme)), []).append(orphan)
    await db.flush()

    touched: set[UUID] = set()
    for snap in adj_snapshots:
        target = pick_line(snap['employee_id'], snap['payment_scheme'])
        if target is None:
            continue
        db.add(
            PayrollAdjustment(
                payroll_run_line_id=target.id,
                type=snap['type'],
                amount=snap['amount'],
                sign=snap['sign'],
                comment=snap['comment'],
                created_by=snap['created_by'],
            )
        )
        touched.add(target.id)
    await db.flush()

    # Reload adjustments onto line objects for totals.
    if touched:
        refreshed = list(
            (
                await db.execute(
                    select(PayrollRunLine)
                    .options(selectinload(PayrollRunLine.adjustments))
                    .where(PayrollRunLine.id.in_(list(touched)))
                )
            )
            .scalars()
            .all()
        )
        for line in refreshed:
            recompute_line_totals(line)

    for employee_id, payout_ids in payout_by_employee.items():
        target = pick_line(employee_id, None)
        if target is None:
            continue
        for payout_id in payout_ids:
            payout = await db.get(PayrollPayout, payout_id)
            if payout is None:
                continue
            payout.payroll_run_line_id = target.id
        await db.flush()
        paid = await sum_payouts_for_line(db, target.id)
        target.payout_status = payout_status_for_amounts(
            total=_q(target.total_amount),
            paid=paid,
            remainder_closed=target.remainder_closed_at is not None,
        )


async def get_run_with_details(
    db: AsyncSession,
    run_id: UUID,
    org_id: UUID,
) -> PayrollRun | None:
    result = await db.execute(
        select(PayrollRun)
        .options(
            selectinload(PayrollRun.lines).selectinload(PayrollRunLine.adjustments),
            selectinload(PayrollRun.lines).selectinload(PayrollRunLine.employee),
        )
        .where(PayrollRun.id == run_id, PayrollRun.org_id == org_id)
    )
    return result.scalar_one_or_none()
