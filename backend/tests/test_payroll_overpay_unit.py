"""In-process overpay guard (no live uvicorn required)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.payroll_payouts import create_linked_payout


@pytest.mark.asyncio
async def test_create_linked_payout_rejects_overpay() -> None:
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    run = MagicMock(status='confirmed', org_id=uuid4())
    line = MagicMock(
        id=uuid4(),
        employee_id=uuid4(),
        total_amount=Decimal('10000.00'),
        remainder_closed_at=None,
        payout_status='unpaid',
    )

    import app.services.payroll_payouts as mod

    original_sum = mod.sum_payouts_for_line
    original_mark = mod.maybe_mark_run_paid
    mod.sum_payouts_for_line = AsyncMock(return_value=Decimal('0.00'))
    mod.maybe_mark_run_paid = MagicMock()
    try:
        with pytest.raises(ValueError, match='превышает'):
            await create_linked_payout(
                db,
                org_id=uuid4(),
                run=run,
                line=line,
                amount_paid=Decimal('10100'),
                payout_method='cash',
                payout_date=date.today(),
                comment='переплата',
                confirmed_by=uuid4(),
            )
    finally:
        mod.sum_payouts_for_line = original_sum
        mod.maybe_mark_run_paid = original_mark


@pytest.mark.asyncio
async def test_create_linked_payout_allows_exact_remainder() -> None:
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    run = MagicMock(status='confirmed', org_id=uuid4())
    line = MagicMock(
        id=uuid4(),
        employee_id=uuid4(),
        total_amount=Decimal('10000.00'),
        remainder_closed_at=None,
        payout_status='unpaid',
    )

    import app.services.payroll_payouts as mod

    original_sum = mod.sum_payouts_for_line
    original_mark = mod.maybe_mark_run_paid
    mod.sum_payouts_for_line = AsyncMock(side_effect=[Decimal('0.00'), Decimal('10000.00')])
    mod.maybe_mark_run_paid = MagicMock()
    try:
        payout = await create_linked_payout(
            db,
            org_id=uuid4(),
            run=run,
            line=line,
            amount_paid=Decimal('10000'),
            payout_method='cash',
            payout_date=date.today(),
            comment='полная выдача',
            confirmed_by=uuid4(),
        )
        assert payout.amount_paid == Decimal('10000.00')
        assert line.payout_status == 'paid'
    finally:
        mod.sum_payouts_for_line = original_sum
        mod.maybe_mark_run_paid = original_mark
