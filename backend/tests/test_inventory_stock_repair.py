"""Unit tests for inventory stock ledger helpers (no live API)."""

from decimal import Decimal

import pytest

from app.models.inventory import InventoryOperationType
from app.services.inventory import (
    _operation_delta,
    assert_non_negative_timeline,
    ledger_final_balance,
    min_opening_to_keep_non_negative,
)
from app.services.reports import inventory_operation_label


def test_operation_delta_signs() -> None:
    assert _operation_delta(InventoryOperationType.income, Decimal('10')) == Decimal('10')
    assert _operation_delta(InventoryOperationType.expense, Decimal('4')) == Decimal('-4')


def test_min_opening_zero_when_timeline_ok() -> None:
    rows = [
        ('income', Decimal('100')),
        ('expense', Decimal('40')),
        ('income', Decimal('10')),
    ]
    assert min_opening_to_keep_non_negative(rows) == Decimal('0')


def test_min_opening_covers_negative_prefix() -> None:
    # History after 021 without opening: expenses alone go negative.
    rows = [
        ('expense', Decimal('30')),
        ('expense', Decimal('20')),
        ('income', Decimal('5')),
    ]
    # Running: -30, -50, -45 → need opening 50
    assert min_opening_to_keep_non_negative(rows) == Decimal('50')


def test_min_opening_idempotent_when_already_non_negative() -> None:
    rows = [
        ('income', Decimal('50')),
        ('expense', Decimal('50')),
    ]
    assert min_opening_to_keep_non_negative(rows) == Decimal('0')


def test_adjustment_ledger_preserves_non_negative_balance() -> None:
    """Opening + income + expense + adjustment(+/-) stays consistent."""
    rows = [
        ('income', Decimal('100')),  # opening
        ('income', Decimal('20')),  # purchase
        ('expense', Decimal('30')),  # write-off
        ('income', Decimal('5')),  # adjustment +
        ('expense', Decimal('10')),  # adjustment -
    ]
    assert_non_negative_timeline(rows)
    assert ledger_final_balance(rows) == Decimal('85')


def test_assert_non_negative_timeline_detects_hole() -> None:
    with pytest.raises(ValueError, match='минус'):
        assert_non_negative_timeline(
            [
                ('expense', Decimal('10')),
                ('income', Decimal('5')),
            ]
        )


def test_inventory_operation_labels_human_readable() -> None:
    assert inventory_operation_label('income', 'general') == 'Приход'
    assert inventory_operation_label('expense', 'general') == 'Расход'
    assert inventory_operation_label('income', 'adjustment') == 'Корректировка (+)'
    assert inventory_operation_label('expense', 'adjustment') == 'Корректировка (−)'
    assert inventory_operation_label('income', 'opening') == 'Начальный остаток'
    assert inventory_operation_label('expense', 'refuel') == 'Заправка'
