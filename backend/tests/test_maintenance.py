"""Maintenance TO formula tests. Run: PYTHONPATH=. pytest tests/test_maintenance.py -q"""

from app.services.maintenance import (
    build_maintenance_summary,
    calculate_hours_to_next_service,
    calculate_next_service_hours,
    calculate_service_progress_percent,
    calculate_to_status,
    next_after_completed_service,
)


def test_next_service_examples() -> None:
    assert calculate_next_service_hours(216, 250) == 250
    assert calculate_next_service_hours(1301, 250) == 1500
    assert calculate_next_service_hours(250, 250) == 250
    assert calculate_next_service_hours(251, 250) == 500
    assert calculate_next_service_hours(0, 250) == 250
    assert calculate_next_service_hours(None, 250) == 250
    assert calculate_next_service_hours(100, None) is None


def test_hours_to_and_progress() -> None:
    assert calculate_hours_to_next_service(216, 250) == 34
    assert calculate_service_progress_percent(216, 250) == 86.4
    assert calculate_service_progress_percent(1301, 250) == 20.4
    assert calculate_to_status(250, 250) == 'overdue'
    assert calculate_to_status(240, 250) == 'warning'
    assert calculate_to_status(100, 250) == 'ok'


def test_after_service() -> None:
    assert next_after_completed_service(250, 250) == 500
    assert next_after_completed_service(251, 250) == 500


def test_summary_dto() -> None:
    summary = build_maintenance_summary(current_hours=216, interval_hours=250)
    assert summary['next_service_hours'] == 250
    assert summary['hours_to_next_service'] == 34
    assert summary['status'] == 'ok'
