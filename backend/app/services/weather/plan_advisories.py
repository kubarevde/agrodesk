"""Attach cached weather advisories to agro plans (no /api/weather contract change)."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from app.models.agro_plan import AgroPlan
from app.models.reference import Location
from app.services.field_geometry import weather_point_from_location
from app.services.weather.advisories import (
    ForecastDayMetrics,
    WeatherAdvisory,
    build_advisories_for_plan,
    is_spray_work,
    iter_plan_dates,
    max_wind_from_day_forecast,
    merge_wind,
    metrics_from_month_days,
)
from app.services.weather.service import fetch_day_forecast, fetch_month_forecast

logger = logging.getLogger(__name__)


def primary_location(plan: AgroPlan) -> Location | None:
    if plan.fields:
        for row in plan.fields:
            if row.location is not None:
                return row.location
    return plan.location


def location_weather_point(location: Location | None) -> tuple[float, float] | None:
    if location is None:
        return None
    return weather_point_from_location(
        latitude=float(location.latitude) if location.latitude is not None else None,
        longitude=float(location.longitude) if location.longitude is not None else None,
        polygon=location.polygon,
    )


def should_compute_advisories(plan: AgroPlan) -> bool:
    if (getattr(plan, 'entry_kind', None) or 'plan') != 'plan':
        return False
    if plan.status in {'done', 'cancelled'}:
        return False
    return True


async def _month_forecast_safe(
    *,
    lat: float,
    lon: float,
    year: int,
    month: int,
    cache: dict[tuple[float, float, int, int], dict[str, Any]],
) -> dict[str, Any]:
    key = (round(lat, 3), round(lon, 3), year, month)
    if key in cache:
        return cache[key]
    try:
        payload = await fetch_month_forecast(lat=lat, lon=lon, year=year, month=month)
    except Exception:
        logger.debug(
            'Month weather unavailable for advisories lat=%s lon=%s %s-%s',
            lat,
            lon,
            year,
            month,
            exc_info=True,
        )
        payload = {'days': [], 'unavailable': True}
    cache[key] = payload
    return payload


async def _day_forecast_safe(
    *,
    lat: float,
    lon: float,
    day,
    cache: dict[tuple[float, float, str], dict[str, Any]],
) -> dict[str, Any]:
    key = (round(lat, 3), round(lon, 3), day.isoformat())
    if key in cache:
        return cache[key]
    try:
        payload = await fetch_day_forecast(lat=lat, lon=lon, day=day)
    except Exception:
        logger.debug(
            'Day weather unavailable for advisories lat=%s lon=%s day=%s',
            lat,
            lon,
            day,
            exc_info=True,
        )
        payload = {'sources': [], 'unavailable': True}
    cache[key] = payload
    return payload


async def compute_plan_advisories(
    plan: AgroPlan,
    *,
    month_cache: dict[tuple[float, float, int, int], dict[str, Any]] | None = None,
    day_cache: dict[tuple[float, float, str], dict[str, Any]] | None = None,
) -> list[WeatherAdvisory]:
    """Build advisories using existing weather fetch + TTL cache (no new providers)."""
    if not should_compute_advisories(plan):
        return []

    location = primary_location(plan)
    point = location_weather_point(location)
    if point is None:
        return []

    lat, lon = point
    work_name = plan.work_type.name if plan.work_type else ''
    dates = iter_plan_dates(plan.planned_date, plan.planned_end_date)
    month_cache = month_cache if month_cache is not None else {}
    day_cache = day_cache if day_cache is not None else {}

    forecast_by_date: dict[str, ForecastDayMetrics] = {}
    months = {(d.year, d.month) for d in dates}
    for year, month in months:
        payload = await _month_forecast_safe(
            lat=lat,
            lon=lon,
            year=year,
            month=month,
            cache=month_cache,
        )
        forecast_by_date.update(metrics_from_month_days(payload.get('days')))

    if is_spray_work(work_name):
        for day in dates:
            day_payload = await _day_forecast_safe(
                lat=lat,
                lon=lon,
                day=day,
                cache=day_cache,
            )
            wind = max_wind_from_day_forecast(day_payload)
            iso = day.isoformat()
            existing = forecast_by_date.get(iso) or ForecastDayMetrics(date=iso)
            forecast_by_date[iso] = merge_wind(existing, wind)

    return build_advisories_for_plan(
        planned_date=plan.planned_date,
        planned_end_date=plan.planned_end_date,
        work_type_name=work_name,
        forecast_by_date=forecast_by_date,
    )


async def advisories_for_plans(plans: list[AgroPlan]) -> dict[UUID, list[WeatherAdvisory]]:
    month_cache: dict[tuple[float, float, int, int], dict[str, Any]] = {}
    day_cache: dict[tuple[float, float, str], dict[str, Any]] = {}
    result: dict[UUID, list[WeatherAdvisory]] = {}
    for plan in plans:
        result[plan.id] = await compute_plan_advisories(
            plan,
            month_cache=month_cache,
            day_cache=day_cache,
        )
    return result
