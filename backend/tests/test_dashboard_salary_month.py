from __future__ import annotations

from datetime import date

from app.services.dashboard import month_range
from app.services.reports import parse_month


def test_month_range_matches_salary_parse_month() -> None:
    today = date(2026, 8, 6)
    assert month_range(today) == parse_month('2026-08')
    assert month_range(today) == (date(2026, 8, 1), date(2026, 8, 31))


def test_month_range_february() -> None:
    assert month_range(date(2024, 2, 10)) == (date(2024, 2, 1), date(2024, 2, 29))
    assert month_range(date(2025, 2, 10)) == (date(2025, 2, 1), date(2025, 2, 28))
