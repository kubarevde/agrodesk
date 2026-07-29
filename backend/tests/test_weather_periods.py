"""Unit tests for morning / midday / evening slot extraction."""

from datetime import datetime

from app.services.weather.periods import (
    HourlySample,
    day_slot_from_daily,
    extract_daily_summary_from_hourly,
    extract_day_periods,
)


def test_extract_day_periods_prefers_target_hours():
    samples = [
        HourlySample(datetime(2026, 7, 28, 7, 0), 15.0, 3),
        HourlySample(datetime(2026, 7, 28, 8, 0), 18.0, 0),
        HourlySample(datetime(2026, 7, 28, 11, 0), 21.0, 1),
        HourlySample(datetime(2026, 7, 28, 12, 0), 23.0, 2),
        HourlySample(datetime(2026, 7, 28, 19, 0), 20.0, 2),
        HourlySample(datetime(2026, 7, 28, 20, 0), 17.5, 61),
    ]
    slots = extract_day_periods(samples)
    assert slots['morning'] is not None
    assert slots['day'] is not None
    assert slots['evening'] is not None
    assert slots['morning'].temp == 18.0
    assert slots['morning'].time == '08:00'
    assert slots['day'].temp == 23.0
    assert slots['day'].time == '12:00'
    assert slots['day'].period == 'day'
    assert slots['evening'].temp == 17.5
    assert slots['evening'].time == '20:00'


def test_midday_window_picks_closest_to_12():
    samples = [
        HourlySample(datetime(2026, 7, 28, 11, 0), 21.0, 1),
        HourlySample(datetime(2026, 7, 28, 13, 0), 24.0, 2),
    ]
    slots = extract_day_periods(samples)
    assert slots['morning'] is None
    assert slots['evening'] is None
    assert slots['day'] is not None
    assert slots['day'].temp == 21.0  # 11 is closer to 12 than 13


def test_daily_summary_from_hourly_is_not_midday():
    samples = [
        HourlySample(datetime(2026, 7, 28, 12, 0), 22.0, 2),
        HourlySample(datetime(2026, 7, 28, 14, 0), 24.0, 3),
    ]
    slots = extract_day_periods(samples)
    assert slots['day'] is not None
    assert slots['day'].temp == 22.0
    summary = extract_daily_summary_from_hourly(samples)
    assert summary is not None
    assert summary.period == 'daily_summary'
    assert summary.temp == 23.0
    assert summary.temp_min == 22.0
    assert summary.temp_max == 24.0


def test_day_slot_from_daily_is_summary():
    slot = day_slot_from_daily(temp_max=26.0, temp_min=14.0, weather_code=80, precipitation_mm=7.1)
    assert slot.period == 'daily_summary'
    assert slot.resolution == 'daily'
    assert slot.temp == 20.0
    assert slot.weather_code == 80
    assert slot.precipitation_mm == 7.1


def test_extract_empty():
    slots = extract_day_periods([])
    assert slots['morning'] is None
    assert slots['day'] is None
    assert slots['evening'] is None
    assert extract_daily_summary_from_hourly([]) is None
