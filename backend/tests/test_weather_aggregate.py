"""Unit tests for weather aggregation (no network)."""

import pytest

from app.services.weather.aggregate import (
    DayObservation,
    aggregate_by_date,
    aggregate_day,
    pick_weather_code,
)
from app.services.weather.cache import TtlCache
from app.services.weather.codes import met_symbol_to_wmo


def test_pick_weather_code_majority():
    assert pick_weather_code([61, 61, 3]) == 61


def test_pick_weather_code_tie_uses_severity():
    # Equal votes: rain (61) vs thunder (95) → thunder wins
    assert pick_weather_code([61, 95]) == 95


def test_aggregate_day_averages_temps():
    obs = [
        DayObservation('2026-07-28', 20.0, 10.0, 3, 1.0, 'open-meteo'),
        DayObservation('2026-07-28', 22.0, 12.0, 3, 3.0, 'met-no'),
    ]
    result = aggregate_day(obs)
    assert result is not None
    assert result.temp_max == 21.0
    assert result.temp_min == 11.0
    assert result.weather_code == 3
    assert result.source_count == 2
    assert result.precipitation_mm == 2.0


def test_aggregate_one_source_only():
    obs = [DayObservation('2026-07-28', 26.3, 14.0, 80, 7.1, 'open-meteo')]
    result = aggregate_day(obs)
    assert result is not None
    assert result.temp_max == 26.3
    assert result.source_count == 1
    assert result.source_ids == ['open-meteo']


def test_aggregate_all_sources_empty():
    assert aggregate_by_date([]) == []
    assert aggregate_day([]) is None


def test_aggregate_by_date_groups():
    obs = [
        DayObservation('2026-07-28', 20.0, 10.0, 3, None, 'open-meteo'),
        DayObservation('2026-07-29', 18.0, 9.0, 61, None, 'open-meteo'),
        DayObservation('2026-07-28', 22.0, 12.0, 2, None, 'met-no'),
    ]
    days = aggregate_by_date(obs)
    assert [d.date for d in days] == ['2026-07-28', '2026-07-29']
    assert days[0].source_count == 2
    assert days[1].source_count == 1


def test_met_symbol_mapping():
    assert met_symbol_to_wmo('clearsky_day') == 0
    assert met_symbol_to_wmo('rain') == 63
    assert met_symbol_to_wmo('heavyrainandthunder') == 95


def test_ttl_cache_hit_and_miss():
    cache = TtlCache(ttl_seconds=60)
    assert cache.get('a') is None
    cache.set('a', {'x': 1})
    assert cache.get('a') == {'x': 1}
    cache.clear()
    assert cache.get('a') is None


def test_pick_weather_code_empty_raises():
    with pytest.raises(ValueError):
        pick_weather_code([])
