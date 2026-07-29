"""Service tests for weather orchestration with mocked providers."""

import asyncio

from app.services.weather.aggregate import DayObservation
from app.services.weather.cache import weather_cache
from app.services.weather.providers import ProviderResult
from app.services.weather import service as weather_service


def setup_function() -> None:
    weather_cache.clear()


def teardown_function() -> None:
    weather_cache.clear()


def test_fetch_month_all_sources_fail(monkeypatch) -> None:
    async def boom_open(*_a, **_k):
        return ProviderResult('open-meteo', 'Open-Meteo', ok=False, error='down')

    async def boom_met(*_a, **_k):
        return ProviderResult('met-no', 'MET Norway', ok=False, error='down')

    monkeypatch.setattr(weather_service, 'fetch_open_meteo', boom_open)
    monkeypatch.setattr(weather_service, 'fetch_met_no', boom_met)

    result = asyncio.run(
        weather_service.fetch_month_forecast(
            lat=51.52,
            lon=36.48,
            year=2026,
            month=7,
            force_refresh=True,
        )
    )
    assert result['sourcesUsed'] == 0
    assert result['sourcesTotal'] == 2
    assert result['unavailable'] is True
    assert result['days'] == []


def test_fetch_month_one_source_ok(monkeypatch) -> None:
    async def open_ok(*_a, **_k):
        return ProviderResult(
            'open-meteo',
            'Open-Meteo',
            ok=True,
            days=[
                DayObservation('2026-07-28', 26.3, 14.0, 80, 7.1, 'open-meteo'),
            ],
        )

    async def met_fail(*_a, **_k):
        return ProviderResult('met-no', 'MET Norway', ok=False, error='out of range')

    monkeypatch.setattr(weather_service, 'fetch_open_meteo', open_ok)
    monkeypatch.setattr(weather_service, 'fetch_met_no', met_fail)

    result = asyncio.run(
        weather_service.fetch_month_forecast(
            lat=51.52,
            lon=36.48,
            year=2026,
            month=7,
            force_refresh=True,
        )
    )
    assert result['sourcesUsed'] == 1
    assert result['sourcesTotal'] == 2
    assert result['unavailable'] is False
    assert len(result['days']) == 1
    assert result['days'][0]['tempMax'] == 26.3


def test_cache_avoids_second_provider_call(monkeypatch) -> None:
    calls = {'n': 0}

    async def open_ok(*_a, **_k):
        calls['n'] += 1
        return ProviderResult(
            'open-meteo',
            'Open-Meteo',
            ok=True,
            days=[DayObservation('2026-07-28', 20.0, 10.0, 3, None, 'open-meteo')],
        )

    async def met_ok(*_a, **_k):
        return ProviderResult(
            'met-no',
            'MET Norway',
            ok=True,
            days=[DayObservation('2026-07-28', 22.0, 12.0, 3, None, 'met-no')],
        )

    monkeypatch.setattr(weather_service, 'fetch_open_meteo', open_ok)
    monkeypatch.setattr(weather_service, 'fetch_met_no', met_ok)

    first = asyncio.run(
        weather_service.fetch_month_forecast(
            lat=51.52, lon=36.48, year=2026, month=7, force_refresh=True
        )
    )
    assert first['cacheHit'] is False
    assert first['days'][0]['tempMax'] == 21.0

    second = asyncio.run(
        weather_service.fetch_month_forecast(
            lat=51.52, lon=36.48, year=2026, month=7, force_refresh=False
        )
    )
    assert second['cacheHit'] is True
    assert calls['n'] == 1
