"""Maintenance TO formula tests. Run: PYTHONPATH=. pytest tests/test_maintenance.py -q"""

from app.services.maintenance import (
    build_maintenance_summary,
    calculate_hours_to_next_service,
    calculate_next_service_hours,
    calculate_service_progress_percent,
    calculate_to_status,
    next_after_completed_service,
    resolve_next_to_at,
)


def test_legacy_ceil_formula_kept() -> None:
    assert calculate_next_service_hours(216, 250) == 250
    assert calculate_next_service_hours(1301, 250) == 1500
    assert calculate_next_service_hours(250, 250) == 250
    assert calculate_next_service_hours(251, 250) == 500
    assert calculate_next_service_hours(0, 250) == 250
    assert calculate_next_service_hours(None, 250) == 250
    assert calculate_next_service_hours(100, None) is None


def test_hours_to_and_progress_offset() -> None:
    # Fallback without absolute next: current + interval
    assert calculate_hours_to_next_service(216, 250) == 250
    assert calculate_service_progress_percent(216, 250) == 0.0
    assert calculate_to_status(250, 250) == 'overdue'
    assert calculate_to_status(240, 250) == 'warning'
    assert calculate_to_status(100, 250) == 'ok'


def test_after_service_legacy() -> None:
    assert next_after_completed_service(250, 250) == 500
    assert next_after_completed_service(251, 250) == 500


def test_summary_uses_current_plus_interval() -> None:
    summary = build_maintenance_summary(current_hours=216, interval_hours=250)
    assert summary['next_service_hours'] == 466
    assert summary['hours_to_next_service'] == 250
    assert summary['status'] == 'ok'


def test_summary_prefers_absolute_next() -> None:
    summary = build_maintenance_summary(
        current_hours=500,
        interval_hours=2000,
        next_service_hours=2500,
    )
    assert summary['next_service_hours'] == 2500
    assert summary['hours_to_next_service'] == 2000
    assert summary['status'] == 'ok'


def test_implement_1500_500_not_overdue() -> None:
    """Create-like case: usage 1500 + interval 500 → next 2000, ok."""
    nxt = resolve_next_to_at(meter_at=1500, next_to_interval=500)
    assert nxt == 2000
    summary = build_maintenance_summary(
        current_hours=1500,
        interval_hours=500,
        next_service_hours=nxt,
    )
    assert summary['status'] == 'ok'
    assert summary['hours_to_next_service'] == 500


def test_resolve_next_to_at_absolute_and_offset() -> None:
    assert resolve_next_to_at(meter_at=500, next_to_at=2500) == 2500
    assert resolve_next_to_at(meter_at=500, next_to_interval=2000) == 2500
    assert resolve_next_to_at(meter_at=500, next_to_at=2500, next_to_interval=2000) == 2500
