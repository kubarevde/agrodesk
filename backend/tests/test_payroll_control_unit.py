"""Unit tests for payroll_control helpers (no live API)."""

from __future__ import annotations

from datetime import date

from app.services.payroll_control import _months_in_range, _overlaps


def test_months_in_range_single() -> None:
    assert _months_in_range(date(2026, 8, 1), date(2026, 8, 31)) == ['2026-08']


def test_months_in_range_cross_year() -> None:
    assert _months_in_range(date(2026, 11, 15), date(2027, 1, 10)) == [
        '2026-11',
        '2026-12',
        '2027-01',
    ]


def test_overlaps() -> None:
    assert _overlaps(date(2026, 8, 1), date(2026, 8, 31), date(2026, 8, 15), date(2026, 8, 20))
    assert not _overlaps(date(2026, 7, 1), date(2026, 7, 31), date(2026, 8, 1), date(2026, 8, 31))


def test_safe_expense_description_hides_technical() -> None:
    from app.services.payroll_control import _safe_expense_description

    assert 'payroll' not in _safe_expense_description(
        'Ручная затрата без payroll_run_line'
    ).lower()
    assert _safe_expense_description('ГСМ склад') == 'ГСМ склад'


def test_month_status_priority_multiple() -> None:
    from app.services.payroll_control import _issue_bucket, _add_issue, _month_status_from_issues
    from decimal import Decimal

    issues = _issue_bucket()
    _add_issue(issues, 'orphan_salary_expense', amount=Decimal('100'))
    _add_issue(issues, 'missing_expense', amount=Decimal('200'))
    status, label, count = _month_status_from_issues(
        issues=issues,
        has_draft=False,
        has_confirmed=True,
        fully_paid=False,
    )
    assert status == 'multiple_issues'
    assert 'Несколько проблем' in label
    assert count == 2


def test_month_status_single_orphan() -> None:
    from app.services.payroll_control import _issue_bucket, _add_issue, _month_status_from_issues
    from decimal import Decimal

    issues = _issue_bucket()
    _add_issue(issues, 'orphan_salary_expense', amount=Decimal('50'))
    status, label, count = _month_status_from_issues(
        issues=issues,
        has_draft=False,
        has_confirmed=True,
        fully_paid=True,
    )
    assert status == 'orphan_salary_expense'
    assert label == 'Есть несвязанные расходы на зарплату'
    assert count == 1

