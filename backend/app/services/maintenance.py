"""Unified maintenance (ТО) calculations for equipment and implements.

Scheduling uses an absolute next reading (`next_to_at` / `next_service_hours`).
When only an interval is known, next = current + interval (same as resolve_next_to_at).
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
    """Legacy ceil-from-zero milestone. Prefer resolve_next_to_at for scheduling."""
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
    if next_service_hours is not None:
        nxt = _f(next_service_hours)
    elif interval_hours is not None and _f(interval_hours) > 0:
        nxt = _f(current_hours) + _f(interval_hours)
    else:
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
    if next_service_hours is not None:
        nxt = _f(next_service_hours)
    else:
        nxt = _f(current_hours) + interval
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
    # Prefer absolute stored next; fallback = current + interval (same as resolve_next_to_at).
    if next_service_hours is not None:
        nxt = _f(next_service_hours)
    elif interval and interval > 0:
        nxt = current + interval
    else:
        nxt = None
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
    """Legacy ceil-from-zero milestone after TO (kept for tests / old callers)."""
    interval = _f(interval_hours)
    if interval <= 0:
        return None
    current = _f(current_hours)
    return (math.floor(current / interval) + 1) * interval


def resolve_next_to_at(
    *,
    meter_at: float | Decimal | int | None,
    next_to_at: float | Decimal | int | None = None,
    next_to_interval: float | Decimal | int | None = None,
) -> float | None:
    """Absolute next reading: prefer next_to_at; else meter_at + interval offset."""
    if next_to_at is not None:
        value = _f(next_to_at)
        return value if value > 0 else None
    if next_to_interval is not None:
        interval = _f(next_to_interval)
        if interval <= 0:
            return None
        return _f(meter_at) + interval
    return None
