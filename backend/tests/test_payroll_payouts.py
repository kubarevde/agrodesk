"""Unit tests for payout status helpers (Prompt #6)."""

from decimal import Decimal

from app.services.payroll_payouts import payout_status_for_amounts


def test_payout_status_unpaid_partial_paid() -> None:
    assert (
        payout_status_for_amounts(
            total=Decimal('1000'),
            paid=Decimal('0'),
            remainder_closed=False,
        )
        == 'unpaid'
    )
    assert (
        payout_status_for_amounts(
            total=Decimal('1000'),
            paid=Decimal('400'),
            remainder_closed=False,
        )
        == 'partially_paid'
    )
    assert (
        payout_status_for_amounts(
            total=Decimal('1000'),
            paid=Decimal('1000'),
            remainder_closed=False,
        )
        == 'paid'
    )
    assert (
        payout_status_for_amounts(
            total=Decimal('1000'),
            paid=Decimal('200'),
            remainder_closed=True,
        )
        == 'paid'
    )
