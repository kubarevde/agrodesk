"""Prompt #4: salary Expense posting on confirm + unconfirm guards."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.payroll_expenses import (
    format_payroll_expense_description,
    unconfirm_payroll_run,
)


def test_expense_description_format() -> None:
    text = format_payroll_expense_description(
        date(2026, 3, 1),
        date(2026, 3, 31),
        'Иванов И.И.',
    )
    assert text == 'Начисление ЗП за 01.03.2026–31.03.2026 — Иванов И.И.'


@pytest.mark.asyncio
async def test_unconfirm_blocked_when_payouts_exist(monkeypatch: pytest.MonkeyPatch) -> None:
    async def has_payouts(*_a, **_k):
        return True

    monkeypatch.setattr(
        'app.services.payroll_expenses.payroll_run_has_payouts',
        has_payouts,
    )
    run = SimpleNamespace(
        status='confirmed',
        lines=[SimpleNamespace(id=uuid4())],
        confirmed_by=uuid4(),
        confirmed_at=date(2026, 3, 31),
    )

    class FakeDb:
        pass

    with pytest.raises(ValueError, match='выдача'):
        await unconfirm_payroll_run(FakeDb(), run=run)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_unconfirm_rejects_non_confirmed() -> None:
    run = SimpleNamespace(status='draft', lines=[])

    class FakeDb:
        pass

    with pytest.raises(ValueError, match='confirmed'):
        await unconfirm_payroll_run(FakeDb(), run=run)  # type: ignore[arg-type]


def test_crosscheck_match_structure() -> None:
    # Pure structure smoke — full DB check is in API tests.
    from app.services.payroll_expenses import SALARY_CATEGORY

    assert SALARY_CATEGORY == 'salary'
    assert Decimal('10.00') == Decimal('10').quantize(Decimal('0.01'))
