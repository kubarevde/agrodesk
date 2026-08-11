"""Prompt #2: payment schemes on apply_salary_to_shift + piecework record math."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.salary import (
    PIECEWORK_UNITS,
    apply_salary_to_shift,
    calculate_amount,
    create_piecework_record,
    resolve_payment_scheme,
    shift_pay_amount,
    shift_pay_is_applicable,
    shift_source_label,
)


def test_piecework_units_unchanged() -> None:
    assert PIECEWORK_UNITS == frozenset({'га', 'т', 'кг', 'шт', 'л', 'м²'})


def test_resolve_payment_scheme_defaults_hourly() -> None:
    assert resolve_payment_scheme(None) == 'hourly'
    assert resolve_payment_scheme(SimpleNamespace(payment_scheme='per_shift')) == 'per_shift'
    assert resolve_payment_scheme(SimpleNamespace(payment_scheme=None)) == 'hourly'


def test_hourly_calculate_amount_regression() -> None:
    rate = SimpleNamespace(
        rate=Decimal('200'),
        overtime_threshold_hours=Decimal('8'),
        overtime_multiplier=Decimal('1.5'),
        payment_scheme='hourly',
    )
    calc = calculate_amount(10.0, rate, fallback_rate=100.0)
    assert calc['total'] == 2200.0


def test_create_piecework_record_amount() -> None:
    record = create_piecework_record(
        org_id=uuid4(),
        employee_id=uuid4(),
        work_type_id=uuid4(),
        quantity=Decimal('12.5'),
        unit='га',
        work_date=date(2026, 8, 1),
        rate_applied=Decimal('1500'),
        created_by=uuid4(),
        shift_id=uuid4(),
    )
    assert record.calculated_amount == Decimal('18750.00')
    assert record.unit == 'га'


def test_shift_pay_monthly_is_n_a_not_fallback() -> None:
    shift = SimpleNamespace(
        calculated_amount=None,
        duration_rounded=Decimal('10'),
        rate_snapshot={'payment_scheme': 'monthly', 'source': 'monthly_scheme', 'rate': 80000},
        employee=SimpleNamespace(hourly_rate=Decimal('500')),
    )
    assert shift_pay_is_applicable(shift) is False
    assert shift_pay_amount(shift) == 0.0
    assert shift_source_label(shift) == 'Оклад'


def test_shift_pay_piecework_is_n_a() -> None:
    shift = SimpleNamespace(
        calculated_amount=None,
        duration_rounded=Decimal('8'),
        rate_snapshot={'payment_scheme': 'piecework', 'source': 'employee_base', 'rate': 100},
        employee=SimpleNamespace(hourly_rate=Decimal('500')),
    )
    assert shift_pay_is_applicable(shift) is False
    assert shift_pay_amount(shift) == 0.0


def test_shift_pay_per_shift_uses_calculated() -> None:
    shift = SimpleNamespace(
        calculated_amount=Decimal('3500'),
        duration_rounded=Decimal('12'),
        rate_snapshot={'payment_scheme': 'per_shift', 'source': 'employee_base', 'total': 3500},
        employee=SimpleNamespace(hourly_rate=Decimal('500')),
    )
    assert shift_pay_is_applicable(shift) is True
    assert shift_pay_amount(shift) == 3500.0
    assert shift_source_label(shift) == 'За смену'


class _FakeShift:
    def __init__(self) -> None:
        self.employee_id = uuid4()
        self.work_type_id = uuid4()
        self.date = date(2026, 8, 1)
        self.org_id = uuid4()
        self.duration_rounded = Decimal('10')
        self.calculated_amount = None
        self.rate_snapshot = None


class _FakeDb:
    async def get(self, _model, _id):
        return SimpleNamespace(hourly_rate=Decimal('100'))


def _rate(scheme: str):
    return SimpleNamespace(
        rate=Decimal('3000'),
        payment_scheme=scheme,
        piecework_unit='га' if scheme == 'piecework' else None,
        overtime_threshold_hours=Decimal('8'),
        overtime_multiplier=Decimal('1'),
    )


@pytest.mark.asyncio
async def test_apply_salary_per_shift(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_rate(*_a, **_k):
        return _rate('per_shift'), 'employee_base'

    monkeypatch.setattr('app.services.salary.get_rate_for_shift', fake_get_rate)
    shift = _FakeShift()
    await apply_salary_to_shift(_FakeDb(), shift)  # type: ignore[arg-type]
    assert shift.calculated_amount == Decimal('3000')
    assert shift.rate_snapshot['payment_scheme'] == 'per_shift'


@pytest.mark.asyncio
async def test_apply_salary_monthly(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_rate(*_a, **_k):
        return _rate('monthly'), 'employee_base'

    monkeypatch.setattr('app.services.salary.get_rate_for_shift', fake_get_rate)
    shift = _FakeShift()
    await apply_salary_to_shift(_FakeDb(), shift)  # type: ignore[arg-type]
    assert shift.calculated_amount is None
    assert shift.rate_snapshot['source'] == 'monthly_scheme'


@pytest.mark.asyncio
async def test_apply_salary_piecework(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_rate(*_a, **_k):
        return _rate('piecework'), 'employee_base'

    monkeypatch.setattr('app.services.salary.get_rate_for_shift', fake_get_rate)
    shift = _FakeShift()
    await apply_salary_to_shift(_FakeDb(), shift)  # type: ignore[arg-type]
    assert shift.calculated_amount is None
    assert shift.rate_snapshot['payment_scheme'] == 'piecework'


@pytest.mark.asyncio
async def test_apply_salary_hourly_unchanged(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_rate(*_a, **_k):
        return _rate('hourly'), 'employee_base'

    monkeypatch.setattr('app.services.salary.get_rate_for_shift', fake_get_rate)
    shift = _FakeShift()
    await apply_salary_to_shift(_FakeDb(), shift)  # type: ignore[arg-type]
    # 8*3000 + 2*3000*1 = 30000
    assert float(shift.calculated_amount) == 30000.0
    assert shift.rate_snapshot['payment_scheme'] == 'hourly'
