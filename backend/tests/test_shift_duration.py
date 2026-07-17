"""Unit tests for manual shift overnight duration and overlap helpers."""

from datetime import date, datetime, time

from app.services.shifts import (
    calc_manual_duration_minutes,
    ranges_overlap,
    resolve_shift_end_datetime,
)


def test_overnight_without_end_date():
    minutes = calc_manual_duration_minutes(
        date(2026, 7, 14),
        time(18, 0),
        time(1, 30),
        end_date=None,
    )
    assert minutes == 7 * 60 + 30


def test_overnight_with_end_date():
    minutes = calc_manual_duration_minutes(
        date(2026, 7, 14),
        time(18, 0),
        time(1, 30),
        end_date=date(2026, 7, 15),
    )
    assert minutes == 7 * 60 + 30


def test_same_day_duration():
    minutes = calc_manual_duration_minutes(
        date(2026, 7, 14),
        time(8, 0),
        time(17, 0),
    )
    assert minutes == 9 * 60


def test_end_before_start_same_day_invalid_via_end_date():
    minutes = calc_manual_duration_minutes(
        date(2026, 7, 14),
        time(18, 0),
        time(1, 30),
        end_date=date(2026, 7, 14),
    )
    assert minutes == 0


def test_resolve_overnight_end():
    end = resolve_shift_end_datetime(date(2026, 7, 14), time(18, 0), time(1, 30))
    assert end == datetime(2026, 7, 15, 1, 30)


def test_ranges_overlap():
    a0 = datetime(2026, 7, 14, 18, 0)
    a1 = datetime(2026, 7, 15, 1, 30)
    b0 = datetime(2026, 7, 14, 22, 0)
    b1 = datetime(2026, 7, 15, 6, 0)
    assert ranges_overlap(a0, a1, b0, b1)
    assert not ranges_overlap(a0, a1, datetime(2026, 7, 15, 2, 0), datetime(2026, 7, 15, 4, 0))
