"""Day forecast orchestration with mocked providers."""

import asyncio
from datetime import date

from app.services.weather.cache import weather_cache
from app.services.weather.day_detail import DaySourceDetail
from app.services.weather import service as weather_service


def setup_function() -> None:
    weather_cache.clear()


def teardown_function() -> None:
    weather_cache.clear()


def test_fetch_day_one_source_down(monkeypatch) -> None:
    async def open_ok(*_a, **_k):
        return DaySourceDetail(
            'open-meteo',
            'Open-Meteo',
            ok=True,
            day={
                'period': 'day',
                'time': '12:00',
                'temp': 23.0,
                'weatherCode': 2,
                'weatherLabel': 'Переменная облачность',
                'precipitationMm': None,
                'windSpeedMs': 3.0,
                'resolution': 'hourly',
            },
            morning={
                'period': 'morning',
                'time': '08:00',
                'temp': 18.0,
                'weatherCode': 0,
                'weatherLabel': 'Ясно',
                'precipitationMm': None,
                'windSpeedMs': 2.0,
                'resolution': 'hourly',
            },
            evening={
                'period': 'evening',
                'time': '20:00',
                'temp': 16.0,
                'weatherCode': 2,
                'weatherLabel': 'Переменная облачность',
                'precipitationMm': None,
                'windSpeedMs': 3.0,
                'resolution': 'hourly',
            },
            daily_summary={
                'period': 'daily_summary',
                'time': None,
                'temp': 17.0,
                'weatherCode': 2,
                'weatherLabel': 'Переменная облачность',
                'precipitationMm': None,
                'windSpeedMs': None,
                'tempMin': 14.0,
                'tempMax': 20.0,
                'resolution': 'daily',
            },
            detail_level='hourly',
        )

    async def met_fail(*_a, **_k):
        return DaySourceDetail(
            'met-no',
            'MET Norway',
            ok=False,
            error='Нет данных на эту дату: MET Norway даёт прогноз примерно на 9 суток вперёд',
        )

    monkeypatch.setattr(weather_service, 'fetch_open_meteo_day_detail', open_ok)
    monkeypatch.setattr(weather_service, 'fetch_met_no_day_detail', met_fail)

    result = asyncio.run(
        weather_service.fetch_day_forecast(
            lat=51.52, lon=36.48, day=date(2026, 7, 20), force_refresh=True
        )
    )
    assert result['sourcesUsed'] == 1
    assert result['sourcesTotal'] == 2
    assert result['unavailable'] is False
    assert result['sources'][0]['ok'] is True
    assert result['sources'][0]['day']['time'] == '12:00'
    assert result['sources'][1]['ok'] is False
    assert result['sources'][1]['id'] == 'met-no'
    assert '9 суток' in (result['sources'][1]['error'] or '')


def test_fetch_day_both_hourly(monkeypatch) -> None:
    async def open_ok(*_a, **_k):
        return DaySourceDetail(
            'open-meteo',
            'Open-Meteo',
            ok=True,
            morning={
                'period': 'morning',
                'time': '08:00',
                'temp': 10.0,
                'weatherCode': 3,
                'weatherLabel': 'Пасмурно',
                'precipitationMm': None,
                'windSpeedMs': None,
            },
            day={
                'period': 'day',
                'time': '12:00',
                'temp': 14.0,
                'weatherCode': 2,
                'weatherLabel': 'Переменная облачность',
                'precipitationMm': None,
                'windSpeedMs': None,
            },
            evening=None,
            detail_level='hourly',
        )

    async def met_ok(*_a, **_k):
        return DaySourceDetail(
            'met-no',
            'MET Norway',
            ok=True,
            morning=None,
            day=None,
            evening={
                'period': 'evening',
                'time': '20:00',
                'temp': 12.0,
                'weatherCode': 61,
                'weatherLabel': 'Небольшой дождь',
                'precipitationMm': 0.2,
                'windSpeedMs': 4.0,
            },
            detail_level='hourly',
        )

    monkeypatch.setattr(weather_service, 'fetch_open_meteo_day_detail', open_ok)
    monkeypatch.setattr(weather_service, 'fetch_met_no_day_detail', met_ok)

    first = asyncio.run(
        weather_service.fetch_day_forecast(
            lat=51.52, lon=36.48, day=date(2026, 7, 28), force_refresh=True
        )
    )
    second = asyncio.run(
        weather_service.fetch_day_forecast(
            lat=51.52, lon=36.48, day=date(2026, 7, 28), force_refresh=False
        )
    )
    assert first['cacheHit'] is False
    assert second['cacheHit'] is True
    assert first['sources'][0]['morning']['temp'] == 10.0
    assert first['sources'][1]['evening']['temp'] == 12.0
    assert first['sources'][1]['name'] == 'MET Norway'


def test_fetch_day_all_down(monkeypatch) -> None:
    async def boom(*_a, **_k):
        return DaySourceDetail('open-meteo', 'Open-Meteo', ok=False, error='down')

    async def boom2(*_a, **_k):
        return DaySourceDetail('met-no', 'MET Norway', ok=False, error='down')

    monkeypatch.setattr(weather_service, 'fetch_open_meteo_day_detail', boom)
    monkeypatch.setattr(weather_service, 'fetch_met_no_day_detail', boom2)

    result = asyncio.run(
        weather_service.fetch_day_forecast(
            lat=51.52, lon=36.48, day=date(2026, 7, 28), force_refresh=True
        )
    )
    assert result['sourcesUsed'] == 0
    assert result['unavailable'] is True
