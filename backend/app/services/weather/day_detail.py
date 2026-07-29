"""Per-source day detail (morning / midday / evening) from real APIs."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

import httpx

from app.services.weather.codes import met_symbol_to_wmo
from app.services.weather.periods import (
    HourlySample,
    day_slot_from_daily,
    extract_daily_summary_from_hourly,
    extract_day_periods,
)
from app.services.weather.providers import (
    FIELD_TZ,
    MET_NO_ID,
    MET_NO_NAME,
    MET_NO_OUT_OF_RANGE,
    OPEN_METEO_ID,
    OPEN_METEO_NAME,
    USER_AGENT,
)

logger = logging.getLogger(__name__)


class DaySourceDetail:
    def __init__(
        self,
        source_id: str,
        source_name: str,
        *,
        ok: bool,
        error: str | None = None,
        day: dict[str, Any] | None = None,
        morning: dict[str, Any] | None = None,
        evening: dict[str, Any] | None = None,
        daily_summary: dict[str, Any] | None = None,
        detail_level: str = 'none',  # hourly | daily | none
    ) -> None:
        self.source_id = source_id
        self.source_name = source_name
        self.ok = ok
        self.error = error
        self.day = day  # midday ~12:00
        self.morning = morning
        self.evening = evening
        self.daily_summary = daily_summary
        self.detail_level = detail_level

    def to_dict(self) -> dict[str, Any]:
        return {
            'id': self.source_id,
            'name': self.source_name,
            'ok': self.ok,
            'error': self.error,
            'day': self.day,
            'morning': self.morning,
            'evening': self.evening,
            'dailySummary': self.daily_summary,
            'detailLevel': self.detail_level,
        }


def _open_meteo_window_for_day(target: date, today: date | None = None) -> tuple[int, int]:
    today = today or datetime.now(FIELD_TZ).date()
    past_days = max(0, min(92, (today - target).days))
    forecast_days = max(1, min(16, (target - today).days + 1))
    past_days = min(92, past_days + 1)
    forecast_days = min(16, forecast_days + 1)
    return past_days, forecast_days


def _parse_open_meteo_daily_summary(payload: dict[str, Any], target: date) -> dict[str, Any] | None:
    daily = payload.get('daily') or {}
    times: list[str] = daily.get('time') or []
    tmax = daily.get('temperature_2m_max') or []
    tmin = daily.get('temperature_2m_min') or []
    codes = daily.get('weather_code') or []
    precip = daily.get('precipitation_sum') or []
    target_str = target.isoformat()
    for index, day_str in enumerate(times):
        if day_str != target_str:
            continue
        if index >= len(tmax) or index >= len(tmin) or index >= len(codes):
            return None
        if tmax[index] is None or tmin[index] is None or codes[index] is None:
            return None
        precip_mm = float(precip[index]) if index < len(precip) and precip[index] is not None else None
        return day_slot_from_daily(
            temp_max=float(tmax[index]),
            temp_min=float(tmin[index]),
            weather_code=int(codes[index]),
            precipitation_mm=precip_mm,
        ).to_dict()
    return None


def _hourly_samples_for_day(payload: dict[str, Any], target: date) -> list[HourlySample]:
    hourly = payload.get('hourly') or {}
    times: list[str] = hourly.get('time') or []
    temps = hourly.get('temperature_2m') or []
    codes = hourly.get('weather_code') or []
    precip = hourly.get('precipitation') or []
    wind = hourly.get('wind_speed_10m') or []

    samples: list[HourlySample] = []
    for index, time_str in enumerate(times):
        try:
            local = datetime.fromisoformat(time_str)
        except ValueError:
            continue
        if local.date() != target:
            continue
        if index >= len(temps) or index >= len(codes):
            continue
        if temps[index] is None or codes[index] is None:
            continue
        precip_mm = float(precip[index]) if index < len(precip) and precip[index] is not None else None
        wind_ms = float(wind[index]) if index < len(wind) and wind[index] is not None else None
        samples.append(
            HourlySample(
                local_time=local,
                temp=float(temps[index]),
                weather_code=int(codes[index]),
                precipitation_mm=precip_mm,
                wind_speed_ms=wind_ms,
            )
        )
    return samples


def _detail_from_samples(
    *,
    source_id: str,
    source_name: str,
    samples: list[HourlySample],
    daily_summary: dict[str, Any] | None,
    empty_error: str,
) -> DaySourceDetail:
    slots = extract_day_periods(samples)
    hourly_summary = extract_daily_summary_from_hourly(samples)
    summary = daily_summary or (hourly_summary.to_dict() if hourly_summary else None)

    morning = slots['morning'].to_dict() if slots['morning'] else None
    day = slots['day'].to_dict() if slots['day'] else None
    evening = slots['evening'].to_dict() if slots['evening'] else None

    if morning is None and day is None and evening is None and summary is None:
        return DaySourceDetail(source_id, source_name, ok=False, error=empty_error)

    has_hourly_slots = morning is not None or day is not None or evening is not None
    return DaySourceDetail(
        source_id,
        source_name,
        ok=True,
        day=day,
        morning=morning,
        evening=evening,
        daily_summary=summary,
        detail_level='hourly' if has_hourly_slots else 'daily',
    )


async def fetch_open_meteo_day_detail(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
    target: date,
) -> DaySourceDetail:
    past_days, forecast_days = _open_meteo_window_for_day(target)
    params: dict[str, Any] = {
        'latitude': lat,
        'longitude': lon,
        'hourly': 'temperature_2m,weather_code,precipitation,wind_speed_10m',
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
        logger.warning('Open-Meteo day detail failed: %s', exc)
        return DaySourceDetail(OPEN_METEO_ID, OPEN_METEO_NAME, ok=False, error=str(exc))

    samples = _hourly_samples_for_day(payload, target)
    return _detail_from_samples(
        source_id=OPEN_METEO_ID,
        source_name=OPEN_METEO_NAME,
        samples=samples,
        daily_summary=_parse_open_meteo_daily_summary(payload, target),
        empty_error='Нет данных на эту дату',
    )


async def fetch_met_no_day_detail(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
    target: date,
) -> DaySourceDetail:
    """Independent MET Norway day detail (forward horizon only)."""
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
        logger.warning('MET Norway day detail failed: %s', exc)
        return DaySourceDetail(MET_NO_ID, MET_NO_NAME, ok=False, error=str(exc))

    timeseries = (payload.get('properties') or {}).get('timeseries') or []
    samples: list[HourlySample] = []
    last_symbol: str | None = None
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
        local = dt.astimezone(FIELD_TZ)
        if local.date() != target:
            continue
        symbol = None
        for key in ('next_1_hours', 'next_6_hours', 'next_12_hours'):
            summary = (data.get(key) or {}).get('summary') or {}
            if summary.get('symbol_code'):
                symbol = summary['symbol_code']
                break
        if symbol is not None:
            last_symbol = symbol
        elif last_symbol is not None:
            # Keep temp for 08/12/20 slots when MET omits symbol on some hours.
            symbol = last_symbol
        else:
            continue
        details_next = (data.get('next_1_hours') or {}).get('details') or {}
        precip = details_next.get('precipitation_amount')
        wind = instant.get('wind_speed')
        samples.append(
            HourlySample(
                local_time=local.replace(tzinfo=None),
                temp=float(temp),
                weather_code=met_symbol_to_wmo(symbol),
                precipitation_mm=float(precip) if precip is not None else None,
                wind_speed_ms=float(wind) if wind is not None else None,
            )
        )

    return _detail_from_samples(
        source_id=MET_NO_ID,
        source_name=MET_NO_NAME,
        samples=samples,
        daily_summary=None,
        empty_error=MET_NO_OUT_OF_RANGE,
    )
