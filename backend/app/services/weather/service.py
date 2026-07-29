"""Weather orchestration: providers → aggregate → cache.

See AUDIT.md in this package for source selection rationale.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.reference import Location
from app.services.weather.aggregate import DayObservation, aggregate_by_date
from app.services.weather.cache import weather_cache
from app.services.weather.day_detail import (
    fetch_met_no_day_detail,
    fetch_open_meteo_day_detail,
)
from app.services.weather.providers import (
    MET_NO_ID,
    MET_NO_NAME,
    OPEN_METEO_ID,
    OPEN_METEO_NAME,
    fetch_met_no,
    fetch_open_meteo,
)

SOURCE_CATALOG = (
    {'id': OPEN_METEO_ID, 'name': OPEN_METEO_NAME},
    {'id': MET_NO_ID, 'name': MET_NO_NAME},
)

DEFAULT_TIMEOUT = 8.0


def _cache_key(lat: float, lon: float, year: int, month: int) -> str:
    return f'm:v3:{round(lat, 3)}:{round(lon, 3)}:{year:04d}-{month:02d}'


def _timeout() -> float:
    return float(getattr(settings, 'WEATHER_PROVIDER_TIMEOUT_SECONDS', DEFAULT_TIMEOUT) or DEFAULT_TIMEOUT)


async def resolve_field(
    db: AsyncSession,
    org_id: UUID,
    field_id: UUID | None,
) -> Location:
    if field_id is not None:
        location = await db.scalar(
            select(Location).where(
                Location.id == field_id,
                Location.org_id == org_id,
                Location.kind == 'field',
            )
        )
        if location is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Field not found')
        return location

    location = await db.scalar(
        select(Location)
        .where(
            Location.org_id == org_id,
            Location.kind == 'field',
            Location.is_active.is_(True),
            Location.latitude.is_not(None),
            Location.longitude.is_not(None),
        )
        .order_by(Location.name)
        .limit(1)
    )
    if location is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='No field with coordinates found',
        )
    return location


async def fetch_month_forecast(
    *,
    lat: float,
    lon: float,
    year: int,
    month: int,
    force_refresh: bool = False,
    fail_sources: set[str] | None = None,
) -> dict[str, Any]:
    """Fetch + aggregate. fail_sources used in tests to simulate provider outages."""
    cache_key = _cache_key(lat, lon, year, month)
    if not force_refresh:
        cached = weather_cache.get(cache_key)
        if cached is not None:
            return {**cached, 'cacheHit': True}

    fail_sources = fail_sources or set()
    timeout = httpx.Timeout(_timeout())
    async with httpx.AsyncClient(timeout=timeout) as client:
        if OPEN_METEO_ID in fail_sources:
            from app.services.weather.providers import ProviderResult

            open_meteo = ProviderResult(
                OPEN_METEO_ID,
                OPEN_METEO_NAME,
                ok=False,
                error='Simulated failure',
            )
        else:
            open_meteo = await fetch_open_meteo(client, lat, lon, year, month)

        if MET_NO_ID in fail_sources:
            from app.services.weather.providers import ProviderResult

            met_no = ProviderResult(
                MET_NO_ID,
                MET_NO_NAME,
                ok=False,
                error='Simulated failure',
            )
        else:
            met_no = await fetch_met_no(client, lat, lon, year, month)

    providers = [open_meteo, met_no]
    observations: list[DayObservation] = []
    sources_meta: list[dict[str, Any]] = []
    for provider in providers:
        sources_meta.append(
            {
                'id': provider.source_id,
                'name': provider.source_name,
                'ok': provider.ok,
                'error': provider.error,
                'daysCount': len(provider.days),
            }
        )
        if provider.ok:
            observations.extend(provider.days)

    aggregated = aggregate_by_date(observations)
    used = sum(1 for s in sources_meta if s['ok'])
    total = len(SOURCE_CATALOG)
    fetched_at = datetime.now(timezone.utc).isoformat()

    if used == 0:
        payload = {
            'latitude': lat,
            'longitude': lon,
            'year': year,
            'month': month,
            'fetchedAt': fetched_at,
            'cacheHit': False,
            'sourcesUsed': 0,
            'sourcesTotal': total,
            'sources': sources_meta,
            'days': [],
            'unavailable': True,
            'message': 'Все внешние источники погоды недоступны',
        }
        return payload

    payload = {
        'latitude': lat,
        'longitude': lon,
        'year': year,
        'month': month,
        'fetchedAt': fetched_at,
        'cacheHit': False,
        'sourcesUsed': used,
        'sourcesTotal': total,
        'sources': sources_meta,
        'unavailable': False,
        'message': None,
        'days': [
            {
                'date': day.date,
                'tempMax': day.temp_max,
                'tempMin': day.temp_min,
                'weatherCode': day.weather_code,
                'weatherLabel': day.weather_label,
                'precipitationMm': day.precipitation_mm,
                'sourceCount': day.source_count,
                'sourceIds': day.source_ids,
            }
            for day in aggregated
        ],
    }
    weather_cache.set(cache_key, {**payload, 'cacheHit': True})
    return payload


def _day_cache_key(lat: float, lon: float, day: date) -> str:
    return f'day:v4:{round(lat, 3)}:{round(lon, 3)}:{day.isoformat()}'


async def fetch_day_forecast(
    *,
    lat: float,
    lon: float,
    day: date,
    force_refresh: bool = False,
    fail_sources: set[str] | None = None,
) -> dict[str, Any]:
    """Per-source morning/midday/evening detail for one calendar day (not averaged)."""
    cache_key = _day_cache_key(lat, lon, day)
    if not force_refresh:
        cached = weather_cache.get(cache_key)
        if cached is not None:
            return {**cached, 'cacheHit': True}

    fail_sources = fail_sources or set()
    timeout = httpx.Timeout(_timeout())
    async with httpx.AsyncClient(timeout=timeout) as client:
        if OPEN_METEO_ID in fail_sources:
            from app.services.weather.day_detail import DaySourceDetail

            open_meteo = DaySourceDetail(
                OPEN_METEO_ID,
                OPEN_METEO_NAME,
                ok=False,
                error='Simulated failure',
            )
        else:
            open_meteo = await fetch_open_meteo_day_detail(client, lat, lon, day)

        if MET_NO_ID in fail_sources:
            from app.services.weather.day_detail import DaySourceDetail

            met_no = DaySourceDetail(
                MET_NO_ID,
                MET_NO_NAME,
                ok=False,
                error='Simulated failure',
            )
        else:
            met_no = await fetch_met_no_day_detail(client, lat, lon, day)

    sources = [open_meteo.to_dict(), met_no.to_dict()]
    used = sum(1 for s in sources if s['ok'])
    fetched_at = datetime.now(timezone.utc).isoformat()
    payload = {
        'date': day.isoformat(),
        'latitude': lat,
        'longitude': lon,
        'fetchedAt': fetched_at,
        'cacheHit': False,
        'sourcesUsed': used,
        'sourcesTotal': len(SOURCE_CATALOG),
        'sources': sources,
        'unavailable': used == 0,
        'message': (
            'Все внешние источники погоды недоступны для этой даты'
            if used == 0
            else None
        ),
    }
    if used > 0:
        weather_cache.set(cache_key, {**payload, 'cacheHit': True})
    return payload


async def get_field_day_weather(
    db: AsyncSession,
    org_id: UUID,
    *,
    field_id: UUID | None,
    day: date,
    force_refresh: bool = False,
) -> dict[str, Any]:
    location = await resolve_field(db, org_id, field_id)
    if location.latitude is None or location.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='У выбранного поля нет координат (широта/долгота)',
        )
    forecast = await fetch_day_forecast(
        lat=float(location.latitude),
        lon=float(location.longitude),
        day=day,
        force_refresh=force_refresh,
    )
    return {
        **forecast,
        'fieldId': str(location.id),
        'fieldName': location.name,
    }


async def get_field_month_weather(
    db: AsyncSession,
    org_id: UUID,
    *,
    field_id: UUID | None,
    year: int,
    month: int,
    force_refresh: bool = False,
) -> dict[str, Any]:
    location = await resolve_field(db, org_id, field_id)
    if location.latitude is None or location.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='У выбранного поля нет координат (широта/долгота)',
        )
    lat = float(location.latitude)
    lon = float(location.longitude)
    forecast = await fetch_month_forecast(
        lat=lat,
        lon=lon,
        year=year,
        month=month,
        force_refresh=force_refresh,
    )
    return {
        **forecast,
        'fieldId': str(location.id),
        'fieldName': location.name,
        # Recommendations intentionally omitted — see AUDIT.md
        'recommendationsAvailable': False,
        'recommendationsNote': (
            'Агрономические рекомендации не реализованы: нет верифицируемого '
            'открытого справочника, привязанного к культуре, региону и фазе сезона.'
        ),
    }
