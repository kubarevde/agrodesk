"""External weather providers — real HTTP only, no synthetic values.

Sources (2026-07-29):
- Open-Meteo (api.open-meteo.com) — primary, full past/forecast calendar coverage
- MET Norway Locationforecast (api.met.no) — independent second source (~9-day forward)

ECMWF via Open-Meteo was removed: same aggregator/endpoint as the primary source
with often near-identical best_match values — not independent for the user.
"""

from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from app.services.weather.aggregate import DayObservation, pick_weather_code
from app.services.weather.codes import met_symbol_to_wmo

FIELD_TZ = ZoneInfo('Europe/Moscow')

logger = logging.getLogger(__name__)

OPEN_METEO_ID = 'open-meteo'
OPEN_METEO_NAME = 'Open-Meteo'
MET_NO_ID = 'met-no'
MET_NO_NAME = 'MET Norway'

USER_AGENT = 'AgroDesk/1.0 (farm weather; contact: support@agrodesk.local)'

# Honest copy when MET has no timeseries for the requested calendar day.
MET_NO_OUT_OF_RANGE = (
    'Нет данных на эту дату: MET Norway даёт прогноз примерно на 9 суток вперёд'
)


class ProviderResult:
    def __init__(
        self,
        source_id: str,
        source_name: str,
        *,
        ok: bool,
        error: str | None = None,
        days: list[DayObservation] | None = None,
    ) -> None:
        self.source_id = source_id
        self.source_name = source_name
        self.ok = ok
        self.error = error
        self.days = days or []


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)
    return start, end


def open_meteo_window(year: int, month: int, today: date | None = None) -> tuple[int, int]:
    """Compute past_days / forecast_days for Open-Meteo to cover a calendar month."""
    today = today or date.today()
    start, end = _month_bounds(year, month)
    past_days = max(0, min(92, (today - start).days))
    forecast_days = max(1, min(16, (end - today).days + 1))
    if end < today:
        past_days = max(past_days, min(92, (today - start).days))
        forecast_days = 1
    if start > today:
        past_days = 0
        forecast_days = max(1, min(16, (end - today).days + 1))
    return past_days, forecast_days


def _parse_open_meteo_month_days(
    payload: dict[str, Any],
    *,
    year: int,
    month: int,
    source_id: str,
) -> list[DayObservation]:
    daily = payload.get('daily') or {}
    times: list[str] = daily.get('time') or []
    tmax: list[Any] = daily.get('temperature_2m_max') or []
    tmin: list[Any] = daily.get('temperature_2m_min') or []
    codes: list[Any] = daily.get('weather_code') or []
    precip: list[Any] = daily.get('precipitation_sum') or []
    start, end = _month_bounds(year, month)
    days: list[DayObservation] = []
    for index, day_str in enumerate(times):
        try:
            day = date.fromisoformat(day_str)
        except ValueError:
            continue
        if day < start or day > end:
            continue
        if index >= len(tmax) or index >= len(tmin) or index >= len(codes):
            continue
        if tmax[index] is None or tmin[index] is None or codes[index] is None:
            continue
        precip_mm = None
        if index < len(precip) and precip[index] is not None:
            precip_mm = float(precip[index])
        days.append(
            DayObservation(
                date=day_str,
                temp_max=float(tmax[index]),
                temp_min=float(tmin[index]),
                weather_code=int(codes[index]),
                precipitation_mm=precip_mm,
                source_id=source_id,
            )
        )
    return days


async def fetch_open_meteo(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
    year: int,
    month: int,
) -> ProviderResult:
    past_days, forecast_days = open_meteo_window(year, month)
    params: dict[str, Any] = {
        'latitude': lat,
        'longitude': lon,
        'daily': 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum',
        'timezone': 'auto',
        'past_days': past_days,
        'forecast_days': forecast_days,
    }
    try:
        response = await client.get(
            'https://api.open-meteo.com/v1/forecast',
            params=params,
            headers={'User-Agent': USER_AGENT},
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning('Open-Meteo month failed: %s', exc)
        return ProviderResult(OPEN_METEO_ID, OPEN_METEO_NAME, ok=False, error=str(exc))

    days = _parse_open_meteo_month_days(
        payload, year=year, month=month, source_id=OPEN_METEO_ID
    )
    if not days:
        return ProviderResult(
            OPEN_METEO_ID,
            OPEN_METEO_NAME,
            ok=False,
            error='No overlapping daily samples for requested month',
        )
    return ProviderResult(OPEN_METEO_ID, OPEN_METEO_NAME, ok=True, days=days)


def _aggregate_met_no_day(
    samples: list[tuple[float, str | None]],
    day_str: str,
) -> DayObservation | None:
    if not samples:
        return None
    temps = [temp for temp, _ in samples]
    symbols = [sym for _, sym in samples if sym]
    if not symbols:
        return None
    codes = [met_symbol_to_wmo(sym) for sym in symbols]
    top_symbol = Counter(symbols).most_common(1)[0][0]
    code = met_symbol_to_wmo(top_symbol)
    if len(set(codes)) > 1:
        code = pick_weather_code(codes)
    return DayObservation(
        date=day_str,
        temp_max=max(temps),
        temp_min=min(temps),
        weather_code=code,
        precipitation_mm=None,
        source_id=MET_NO_ID,
    )


async def fetch_met_no(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
    year: int,
    month: int,
) -> ProviderResult:
    """Independent MET Norway locationforecast — forward ~9 days only."""
    try:
        response = await client.get(
            'https://api.met.no/weatherapi/locationforecast/2.0/compact',
            params={'lat': lat, 'lon': lon},
            headers={
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning('MET Norway month failed: %s', exc)
        return ProviderResult(MET_NO_ID, MET_NO_NAME, ok=False, error=str(exc))

    timeseries = (payload.get('properties') or {}).get('timeseries') or []
    start, end = _month_bounds(year, month)
    by_day: dict[str, list[tuple[float, str | None]]] = defaultdict(list)
    for point in timeseries:
        time_str = point.get('time')
        data = point.get('data') or {}
        instant = (data.get('instant') or {}).get('details') or {}
        temp = instant.get('air_temperature')
        if time_str is None or temp is None:
            continue
        try:
            dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        except ValueError:
            continue
        day = dt.astimezone(FIELD_TZ).date()
        if day < start or day > end:
            continue
        symbol = None
        for key in ('next_6_hours', 'next_1_hours', 'next_12_hours'):
            summary = (data.get(key) or {}).get('summary') or {}
            if summary.get('symbol_code'):
                symbol = summary['symbol_code']
                break
        by_day[day.isoformat()].append((float(temp), symbol))

    days: list[DayObservation] = []
    for day_str, samples in sorted(by_day.items()):
        obs = _aggregate_met_no_day(samples, day_str)
        if obs is not None:
            days.append(obs)

    if not days:
        return ProviderResult(
            MET_NO_ID,
            MET_NO_NAME,
            ok=False,
            error=MET_NO_OUT_OF_RANGE,
        )
    return ProviderResult(MET_NO_ID, MET_NO_NAME, ok=True, days=days)
