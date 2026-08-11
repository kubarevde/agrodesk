"""Unit tests for human-readable shift time adjustment audit summary."""

from datetime import date, time

from app.routers.shifts import build_shift_time_adjust_summary


def test_summary_start_and_end_change():
    text = build_shift_time_adjust_summary(
        before_date=date(2026, 8, 1),
        before_start=time(8, 0),
        before_end=time(17, 0),
        before_end_date=None,
        after_date=date(2026, 8, 1),
        after_start=time(7, 30),
        after_end=time(18, 0),
        after_end_date=None,
    )
    assert 'Скорректировано время смены' in text
    assert 'начало 01.08.2026 08:00 → 01.08.2026 07:30' in text
    assert 'окончание 01.08.2026 17:00 → 01.08.2026 18:00' in text
    assert 'uuid' not in text.lower()


def test_summary_overnight_end_date():
    text = build_shift_time_adjust_summary(
        before_date=date(2026, 8, 1),
        before_start=time(22, 0),
        before_end=time(6, 0),
        before_end_date=date(2026, 8, 2),
        after_date=date(2026, 8, 1),
        after_start=time(22, 0),
        after_end=time(7, 0),
        after_end_date=date(2026, 8, 2),
    )
    assert 'окончание 02.08.2026 06:00 → 02.08.2026 07:00' in text
