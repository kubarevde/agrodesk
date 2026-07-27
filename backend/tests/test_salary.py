from __future__ import annotations

from app.services.salary import calculate_amount


class DummyRate:
    # Simulate legacy/dirty rows where numeric columns could be NULL.
    rate = None
    overtime_threshold_hours = None
    overtime_multiplier = None


def test_calculate_amount_handles_none_rate_parts() -> None:
    calc = calculate_amount(hours=10.0, rate_obj=DummyRate(), fallback_rate=100.0)
    # Defaults: threshold=8.0, multiplier=1.0, rate=fallback_rate=100.0
    # Regular: 8h * 100 = 800
    # Overtime: (10-8)=2h * 100 * 1 = 200
    assert calc['total'] == 1000.0

