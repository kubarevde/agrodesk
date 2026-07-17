"""Overlap rules for manual/retrospective shifts vs open shifts."""

from datetime import date, datetime, time

from app.services.shifts import ranges_overlap, shift_time_range


def test_open_shift_does_not_overlap_earlier_retrospective():
    """Open shift on 16.07 must not collide with closed 01.07–02.07."""
    now = datetime(2026, 7, 16, 12, 0, 0)
    open_start, open_end = shift_time_range(
        date(2026, 7, 16),
        time(8, 0),
        None,
        now=now,
    )
    assert open_end == now

    retro_start = datetime(2026, 7, 1, 8, 0)
    retro_end = datetime(2026, 7, 2, 17, 0)
    assert not ranges_overlap(retro_start, retro_end, open_start, open_end)


def test_open_shift_overlaps_same_morning_window():
    now = datetime(2026, 7, 16, 12, 0, 0)
    open_start, open_end = shift_time_range(
        date(2026, 7, 16),
        time(8, 0),
        None,
        now=now,
    )
    other_start = datetime(2026, 7, 16, 7, 0)
    other_end = datetime(2026, 7, 16, 9, 0)
    assert ranges_overlap(other_start, other_end, open_start, open_end)


def test_open_shift_allows_same_day_before_start():
    now = datetime(2026, 7, 16, 12, 0, 0)
    open_start, open_end = shift_time_range(
        date(2026, 7, 16),
        time(8, 0),
        None,
        now=now,
    )
    before_start = datetime(2026, 7, 16, 6, 0)
    before_end = datetime(2026, 7, 16, 7, 0)
    assert not ranges_overlap(before_start, before_end, open_start, open_end)


def test_overnight_closed_vs_open_overlap():
    now = datetime(2026, 7, 16, 12, 0, 0)
    open_start, open_end = shift_time_range(
        date(2026, 7, 16),
        time(8, 0),
        None,
        now=now,
    )
    night_start = datetime(2026, 7, 15, 22, 0)
    night_end = datetime(2026, 7, 16, 9, 0)
    assert ranges_overlap(night_start, night_end, open_start, open_end)
