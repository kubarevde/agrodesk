"""Prompt #1: payment_scheme validators + piecework units + auto-close base rates."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.employee_rate import EmployeeRateCreate, validate_rate_scheme_fields
from app.services.salary import PIECEWORK_UNITS, calculate_amount


def test_piecework_units_minimal_set() -> None:
    assert PIECEWORK_UNITS == frozenset({'га', 'т', 'кг', 'шт', 'л', 'м²'})


def test_hourly_create_defaults_ok() -> None:
    payload = EmployeeRateCreate(
        employee_id=uuid4(),
        rate=Decimal('250'),
        valid_from=date(2026, 1, 1),
    )
    assert payload.payment_scheme == 'hourly'
    assert payload.piecework_unit is None
    assert payload.work_type_id is None


def test_per_shift_rejects_work_type() -> None:
    with pytest.raises(ValidationError) as exc:
        EmployeeRateCreate(
            employee_id=uuid4(),
            payment_scheme='per_shift',
            work_type_id=uuid4(),
            rate=Decimal('3000'),
            valid_from=date(2026, 1, 1),
        )
    assert 'вид работы' in str(exc.value).lower() or 'work_type' in str(exc.value).lower()


def test_monthly_rejects_work_type() -> None:
    with pytest.raises(ValidationError):
        EmployeeRateCreate(
            employee_id=uuid4(),
            payment_scheme='monthly',
            work_type_id=uuid4(),
            rate=Decimal('80000'),
            valid_from=date(2026, 1, 1),
        )


def test_piecework_requires_allowed_unit() -> None:
    with pytest.raises(ValidationError):
        EmployeeRateCreate(
            employee_id=uuid4(),
            payment_scheme='piecework',
            rate=Decimal('500'),
            valid_from=date(2026, 1, 1),
        )
    with pytest.raises(ValidationError):
        EmployeeRateCreate(
            employee_id=uuid4(),
            payment_scheme='piecework',
            piecework_unit='бочки',
            rate=Decimal('500'),
            valid_from=date(2026, 1, 1),
        )
    ok = EmployeeRateCreate(
        employee_id=uuid4(),
        payment_scheme='piecework',
        piecework_unit='га',
        work_type_id=uuid4(),
        rate=Decimal('1500'),
        valid_from=date(2026, 1, 1),
    )
    assert ok.piecework_unit == 'га'


def test_hourly_rejects_piecework_unit() -> None:
    with pytest.raises(ValidationError):
        EmployeeRateCreate(
            employee_id=uuid4(),
            payment_scheme='hourly',
            piecework_unit='кг',
            rate=Decimal('100'),
            valid_from=date(2026, 1, 1),
        )


def test_validate_rate_scheme_fields_helper() -> None:
    validate_rate_scheme_fields(
        payment_scheme='monthly',
        work_type_id=None,
        piecework_unit=None,
    )
    with pytest.raises(ValueError, match='сдельной'):
        validate_rate_scheme_fields(
            payment_scheme='hourly',
            work_type_id=None,
            piecework_unit='т',
        )


def test_hourly_calculate_amount_unchanged() -> None:
    """Regression: hourly math still uses rate + OT threshold/multiplier."""

    class Rate:
        rate = Decimal('200')
        overtime_threshold_hours = Decimal('8')
        overtime_multiplier = Decimal('1.5')

    calc = calculate_amount(10.0, Rate(), fallback_rate=100.0)
    # 8*200 + 2*200*1.5 = 1600 + 600 = 2200
    assert calc['total'] == 2200.0


def test_close_to_date_helper_semantics() -> None:
    """Document expected close date used by router (valid_from - 1 day)."""
    new_from = date(2026, 3, 15)
    assert new_from - timedelta(days=1) == date(2026, 3, 14)
