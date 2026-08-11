"""Prompt #3: payroll run aggregation, segments, adjustments, overlap."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.payroll import PayrollAdjustmentCreate
from app.services.payroll import (
    SchemeSegment,
    build_base_scheme_segments,
    compute_segment_base,
    overlapping_payroll_run_exists,
    period_days,
    recompute_line_totals,
    resolve_adjustment_sign,
)


def _rate(
    *,
    employee_id,
    valid_from: date,
    valid_to: date | None,
    scheme: str,
    rate: str,
    work_type_id=None,
):
    return SimpleNamespace(
        employee_id=employee_id,
        work_type_id=work_type_id,
        valid_from=valid_from,
        valid_to=valid_to,
        payment_scheme=scheme,
        rate=Decimal(rate),
    )


def test_period_days() -> None:
    assert period_days(date(2026, 3, 1), date(2026, 3, 31)) == 31
    assert period_days(date(2026, 2, 1), date(2026, 2, 28)) == 28


def test_overlap_detection() -> None:
    runs = [
        SimpleNamespace(
            id=uuid4(),
            period_start=date(2026, 3, 1),
            period_end=date(2026, 3, 31),
        )
    ]
    assert overlapping_payroll_run_exists(runs, date(2026, 3, 15), date(2026, 4, 15))
    assert overlapping_payroll_run_exists(runs, date(2026, 2, 1), date(2026, 3, 1))
    assert not overlapping_payroll_run_exists(runs, date(2026, 4, 1), date(2026, 4, 30))
    assert not overlapping_payroll_run_exists(
        runs,
        date(2026, 3, 1),
        date(2026, 3, 31),
        exclude_id=runs[0].id,
    )


def test_scheme_change_splits_into_two_segments() -> None:
    emp = uuid4()
    rates = [
        _rate(
            employee_id=emp,
            valid_from=date(2026, 3, 1),
            valid_to=date(2026, 3, 15),
            scheme='hourly',
            rate='200',
        ),
        _rate(
            employee_id=emp,
            valid_from=date(2026, 3, 16),
            valid_to=None,
            scheme='monthly',
            rate='90000',
        ),
    ]
    segments = build_base_scheme_segments(rates, date(2026, 3, 1), date(2026, 3, 31), emp)
    assert len(segments) == 2
    assert segments[0].payment_scheme == 'hourly'
    assert segments[0].segment_start == date(2026, 3, 1)
    assert segments[0].segment_end == date(2026, 3, 15)
    assert segments[1].payment_scheme == 'monthly'
    assert segments[1].segment_start == date(2026, 3, 16)
    assert segments[1].segment_end == date(2026, 3, 31)


def test_monthly_proration_formula() -> None:
    emp = uuid4()
    segment = SchemeSegment(
        employee_id=emp,
        payment_scheme='monthly',
        segment_start=date(2026, 3, 16),
        segment_end=date(2026, 3, 31),
        rate=Decimal('90000'),
    )
    amount, breakdown = compute_segment_base(
        segment,
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
        shifts=[],
        pieceworks=[],
    )
    # 16 days / 31 * 90000
    expected = (Decimal('90000') * Decimal(16) / Decimal(31)).quantize(Decimal('0.01'))
    assert amount == expected
    assert breakdown['calendar_days'] == 16
    assert breakdown['period_days'] == 31


def test_hourly_and_per_shift_sum_shift_amounts() -> None:
    emp = uuid4()
    shifts = [
        SimpleNamespace(
            id=uuid4(),
            employee_id=emp,
            date=date(2026, 3, 2),
            calculated_amount=Decimal('1500'),
        ),
        SimpleNamespace(
            id=uuid4(),
            employee_id=emp,
            date=date(2026, 3, 10),
            calculated_amount=Decimal('4200'),
        ),
        SimpleNamespace(
            id=uuid4(),
            employee_id=emp,
            date=date(2026, 4, 1),
            calculated_amount=Decimal('999'),
        ),
    ]
    hourly = SchemeSegment(
        employee_id=emp,
        payment_scheme='hourly',
        segment_start=date(2026, 3, 1),
        segment_end=date(2026, 3, 5),
        rate=Decimal('200'),
    )
    amount, br = compute_segment_base(
        hourly,
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
        shifts=shifts,
        pieceworks=[],
    )
    assert amount == Decimal('1500.00')
    assert br['shifts_count'] == 1

    per_shift = SchemeSegment(
        employee_id=emp,
        payment_scheme='per_shift',
        segment_start=date(2026, 3, 1),
        segment_end=date(2026, 3, 31),
        rate=Decimal('4200'),
    )
    amount2, br2 = compute_segment_base(
        per_shift,
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
        shifts=shifts,
        pieceworks=[],
    )
    assert amount2 == Decimal('5700.00')
    assert br2['shifts_count'] == 2


def test_piecework_sums_records() -> None:
    emp = uuid4()
    records = [
        SimpleNamespace(
            id=uuid4(),
            employee_id=emp,
            date=date(2026, 3, 5),
            calculated_amount=Decimal('18750'),
        ),
        SimpleNamespace(
            id=uuid4(),
            employee_id=emp,
            date=date(2026, 3, 20),
            calculated_amount=Decimal('3000'),
        ),
    ]
    segment = SchemeSegment(
        employee_id=emp,
        payment_scheme='piecework',
        segment_start=date(2026, 3, 1),
        segment_end=date(2026, 3, 31),
        rate=Decimal('1500'),
    )
    amount, br = compute_segment_base(
        segment,
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
        shifts=[],
        pieceworks=records,
    )
    assert amount == Decimal('21750.00')
    assert br['piecework_count'] == 2


def test_adjustment_signs() -> None:
    assert resolve_adjustment_sign('bonus', None) == 1
    assert resolve_adjustment_sign('penalty', None) == -1
    assert resolve_adjustment_sign('deduction', 1) == -1
    assert resolve_adjustment_sign('other', -1) == -1
    with pytest.raises(ValueError):
        resolve_adjustment_sign('other', None)
    with pytest.raises(ValueError):
        resolve_adjustment_sign('advance', None)  # type: ignore[arg-type]


def test_other_adjustment_schema_requires_comment_and_sign() -> None:
    with pytest.raises(ValidationError):
        PayrollAdjustmentCreate(type='other', amount=Decimal('100'), sign=-1)
    with pytest.raises(ValidationError):
        PayrollAdjustmentCreate(type='other', amount=Decimal('100'), comment='x')
    ok = PayrollAdjustmentCreate(
        type='other',
        amount=Decimal('100'),
        sign=-1,
        comment='Удержание за форму',
    )
    assert ok.sign == -1


def test_recompute_line_totals_with_other_minus() -> None:
    line = SimpleNamespace(
        base_calculated_amount=Decimal('10000'),
        adjustments_total=Decimal('0'),
        total_amount=Decimal('0'),
        adjustments=[
            SimpleNamespace(amount=Decimal('500'), sign=1, type='bonus'),
            SimpleNamespace(amount=Decimal('200'), sign=-1, type='other'),
        ],
    )
    recompute_line_totals(line)  # type: ignore[arg-type]
    assert line.adjustments_total == Decimal('300.00')
    assert line.total_amount == Decimal('10300.00')


def test_all_four_schemes_amounts_unit() -> None:
    """Sanity: one employee-period covering all scheme formulas."""
    emp = uuid4()
    period_start = date(2026, 3, 1)
    period_end = date(2026, 3, 31)

    # hourly week 1
    hourly_seg = SchemeSegment(emp, 'hourly', date(2026, 3, 1), date(2026, 3, 7), Decimal('250'))
    # per_shift week 2
    per_seg = SchemeSegment(emp, 'per_shift', date(2026, 3, 8), date(2026, 3, 14), Decimal('4000'))
    # monthly rest (17 days: 15-31)
    monthly_seg = SchemeSegment(emp, 'monthly', date(2026, 3, 15), date(2026, 3, 25), Decimal('62000'))
    # piecework last days
    piece_seg = SchemeSegment(emp, 'piecework', date(2026, 3, 26), date(2026, 3, 31), Decimal('1000'))

    shifts = [
        SimpleNamespace(id=uuid4(), employee_id=emp, date=date(2026, 3, 2), calculated_amount=Decimal('2000')),
        SimpleNamespace(id=uuid4(), employee_id=emp, date=date(2026, 3, 9), calculated_amount=Decimal('4000')),
    ]
    pieceworks = [
        SimpleNamespace(id=uuid4(), employee_id=emp, date=date(2026, 3, 27), calculated_amount=Decimal('5000')),
    ]

    h, _ = compute_segment_base(hourly_seg, period_start=period_start, period_end=period_end, shifts=shifts, pieceworks=[])
    p, _ = compute_segment_base(per_seg, period_start=period_start, period_end=period_end, shifts=shifts, pieceworks=[])
    m, _ = compute_segment_base(monthly_seg, period_start=period_start, period_end=period_end, shifts=[], pieceworks=[])
    w, _ = compute_segment_base(piece_seg, period_start=period_start, period_end=period_end, shifts=[], pieceworks=pieceworks)

    assert h == Decimal('2000.00')
    assert p == Decimal('4000.00')
    assert m == (Decimal('62000') * Decimal(11) / Decimal(31)).quantize(Decimal('0.01'))
    assert w == Decimal('5000.00')
