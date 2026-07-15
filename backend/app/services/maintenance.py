"""Unified maintenance (ТО) calculations for equipment and implements.

Next service uses the nearest interval multiple from 0 (not current + interval).

Examples (current / interval → next):
  216 / 250 → 250
  1301 / 250 → 1500
  250 / 250 → 250
  251 / 250 → 500
  0 / 250 → 250
"""

from __future__ import annotations

import math
from decimal import Decimal


def _f(value: float | Decimal | int | None) -> float:
    return float(value or 0)


def calculate_next_service_hours(
    current_hours: float | Decimal | int | None,
    interval_hours: float | Decimal | int | None,
) -> float | None:
    """Nearest interval multiple at or above current (from 0)."""
    interval = _f(interval_hours)
    if interval <= 0:
        return None
    current = _f(current_hours)
    if current <= 0:
        return interval
    return math.ceil(current / interval) * interval


def calculate_hours_to_next_service(
    current_hours: float | Decimal | int | None,
    interval_hours: float | Decimal | int | None,
    *,
    next_service_hours: float | Decimal | int | None = None,
) -> float | None:
    nxt = (
        _f(next_service_hours)
        if next_service_hours is not None
        else calculate_next_service_hours(current_hours, interval_hours)
    )
    if nxt is None:
        return None
    return max(0.0, nxt - _f(current_hours))


def calculate_service_progress_percent(
    current_hours: float | Decimal | int | None,
    interval_hours: float | Decimal | int | None,
    *,
    next_service_hours: float | Decimal | int | None = None,
) -> float | None:
    """Progress within the current interval window (0–100)."""
    interval = _f(interval_hours)
    if interval <= 0:
        return None
    nxt = (
        _f(next_service_hours)
        if next_service_hours is not None
        else calculate_next_service_hours(current_hours, interval_hours)
    )
    if nxt is None:
        return None
    prev = max(0.0, nxt - interval)
    current = _f(current_hours)
    if current <= prev:
        return 0.0
    if current >= nxt:
        return 100.0
    return round((current - prev) / interval * 100.0, 1)


def calculate_to_status(
    current_hours: float | Decimal | int | None,
    next_service_hours: float | Decimal | int | None,
) -> str:
    """ok | warning | overdue | no_data — same rules for list and detail."""
    if next_service_hours is None:
        return 'no_data'
    current = _f(current_hours)
    threshold = _f(next_service_hours)
    if current >= threshold:
        return 'overdue'
    if current >= threshold * 0.9:
        return 'warning'
    return 'ok'


def build_maintenance_summary(
    *,
    current_hours: float | Decimal | int | None,
    interval_hours: float | Decimal | int | None,
    next_service_hours: float | Decimal | int | None = None,
) -> dict[str, float | str | None]:
    """Single DTO used by equipment and implements responses."""
    interval = _f(interval_hours) if interval_hours is not None else None
    current = _f(current_hours)
    nxt = (
        _f(next_service_hours)
        if next_service_hours is not None
        else calculate_next_service_hours(current, interval)
    )
    # Keep stored next if set, else compute; if interval exists always prefer formula
    # so list/detail never diverge after meter updates.
    if interval and interval > 0:
        nxt = calculate_next_service_hours(current, interval)
    return {
        'current_hours': current,
        'service_interval_hours': interval if interval and interval > 0 else None,
        'next_service_hours': nxt,
        'hours_to_next_service': (
            calculate_hours_to_next_service(current, interval, next_service_hours=nxt)
            if nxt is not None
            else None
        ),
        'progress_percent': (
            calculate_service_progress_percent(current, interval, next_service_hours=nxt)
            if nxt is not None and interval and interval > 0
            else None
        ),
        'status': calculate_to_status(current, nxt),
    }


def next_after_completed_service(
    current_hours: float | Decimal | int | None,
    interval_hours: float | Decimal | int | None,
) -> float | None:
    """After TO is recorded at current reading, schedule the following milestone."""
    interval = _f(interval_hours)
    if interval <= 0:
        return None
    current = _f(current_hours)
    return (math.floor(current / interval) + 1) * interval
