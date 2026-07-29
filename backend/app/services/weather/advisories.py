"""Weather risk advisories for agro-calendar plans.

Uses already-fetched forecast metrics (temp / precip / wind) — no new providers.
Agronomic culture-phase recommendations remain out of scope (see AUDIT.md).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Literal

Severity = Literal['info', 'warning']

FROST_TEMP_C = 0.0
HEAVY_RAIN_MM = 10.0
MODERATE_RAIN_MM = 5.0
STRONG_WIND_MS = 7.0
MODERATE_WIND_MS = 5.0

SPRAY_KEYWORDS = (
    'опрыск',
    'распыл',
    'spray',
    'гербицид',
    'фунгицид',
    'инсектицид',
)


@dataclass(frozen=True)
class ForecastDayMetrics:
    date: str  # YYYY-MM-DD
    temp_min: float | None = None
    temp_max: float | None = None
    precipitation_mm: float | None = None
    wind_speed_ms: float | None = None


@dataclass(frozen=True)
class WeatherAdvisory:
    code: str
    severity: Severity
    title: str
    message: str
    date: str
    temp_min: float | None = None
    temp_max: float | None = None
    precipitation_mm: float | None = None
    wind_speed_ms: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            'code': self.code,
            'severity': self.severity,
            'title': self.title,
            'message': self.message,
            'date': self.date,
            'temp_min': self.temp_min,
            'temp_max': self.temp_max,
            'precipitation_mm': self.precipitation_mm,
            'wind_speed_ms': self.wind_speed_ms,
        }


def is_spray_work(work_type_name: str | None) -> bool:
    text = (work_type_name or '').casefold()
    return any(token in text for token in SPRAY_KEYWORDS)


def iter_plan_dates(planned_date: date, planned_end_date: date | None) -> list[date]:
    end = planned_end_date or planned_date
    if end < planned_date:
        end = planned_date
    days: list[date] = []
    cursor = planned_date
    # Cap multi-day spans so a bad end date cannot explode work
    while cursor <= end and len(days) < 31:
        days.append(cursor)
        cursor += timedelta(days=1)
    return days


def metrics_from_month_days(days: list[dict[str, Any]] | None) -> dict[str, ForecastDayMetrics]:
    """Map Open-Meteo/MET aggregated month `days[]` into per-date metrics."""
    result: dict[str, ForecastDayMetrics] = {}
    for raw in days or []:
        day = str(raw.get('date') or '')
        if not day:
            continue
        result[day] = ForecastDayMetrics(
            date=day,
            temp_min=_as_float(raw.get('tempMin')),
            temp_max=_as_float(raw.get('tempMax')),
            precipitation_mm=_as_float(raw.get('precipitationMm')),
            wind_speed_ms=None,
        )
    return result


def max_wind_from_day_forecast(day_payload: dict[str, Any] | None) -> float | None:
    """Best-effort max wind (m/s) across successful day-detail sources/slots."""
    if not day_payload:
        return None
    values: list[float] = []
    for source in day_payload.get('sources') or []:
        if not isinstance(source, dict) or not source.get('ok'):
            continue
        for key in ('morning', 'day', 'evening', 'dailySummary'):
            slot = source.get(key)
            if not isinstance(slot, dict):
                continue
            wind = _as_float(slot.get('windSpeedMs'))
            if wind is not None:
                values.append(wind)
    if not values:
        return None
    return round(max(values), 1)


def merge_wind(
    metrics: ForecastDayMetrics,
    wind_speed_ms: float | None,
) -> ForecastDayMetrics:
    if wind_speed_ms is None:
        return metrics
    return ForecastDayMetrics(
        date=metrics.date,
        temp_min=metrics.temp_min,
        temp_max=metrics.temp_max,
        precipitation_mm=metrics.precipitation_mm,
        wind_speed_ms=wind_speed_ms,
    )


def build_advisories_for_plan(
    *,
    planned_date: date,
    planned_end_date: date | None,
    work_type_name: str | None,
    forecast_by_date: dict[str, ForecastDayMetrics],
) -> list[WeatherAdvisory]:
    """Pure advisory builder — callers supply synthetic or cached forecast maps."""
    spray = is_spray_work(work_type_name)
    advisories: list[WeatherAdvisory] = []
    for day in iter_plan_dates(planned_date, planned_end_date):
        key = day.isoformat()
        metrics = forecast_by_date.get(key)
        if metrics is None:
            continue
        advisories.extend(_frost_advisory(metrics))
        advisories.extend(_rain_advisory(metrics))
        if spray:
            advisories.extend(_wind_spray_advisory(metrics))
    return advisories


def _frost_advisory(metrics: ForecastDayMetrics) -> list[WeatherAdvisory]:
    if metrics.temp_min is None or metrics.temp_min >= FROST_TEMP_C:
        return []
    return [
        WeatherAdvisory(
            code='frost',
            severity='warning',
            title='Заморозки',
            message=(
                f'На {metrics.date} ожидается минимум {metrics.temp_min:.1f}°C '
                f'(ниже 0°C) — риск для запланированных полевых работ.'
            ),
            date=metrics.date,
            temp_min=metrics.temp_min,
            temp_max=metrics.temp_max,
            precipitation_mm=metrics.precipitation_mm,
            wind_speed_ms=metrics.wind_speed_ms,
        )
    ]


def _rain_advisory(metrics: ForecastDayMetrics) -> list[WeatherAdvisory]:
    precip = metrics.precipitation_mm
    if precip is None:
        return []
    if precip >= HEAVY_RAIN_MM:
        severity: Severity = 'warning'
        title = 'Сильные осадки'
        message = (
            f'На {metrics.date} ожидается около {precip:.1f} мм осадков '
            f'(≥ {HEAVY_RAIN_MM:.0f} мм) — полевые работы могут быть затруднены.'
        )
    elif precip >= MODERATE_RAIN_MM:
        severity = 'info'
        title = 'Осадки'
        message = (
            f'На {metrics.date} ожидается около {precip:.1f} мм осадков '
            f'(≥ {MODERATE_RAIN_MM:.0f} мм) — учтите при планировании.'
        )
    else:
        return []
    return [
        WeatherAdvisory(
            code='heavy_rain',
            severity=severity,
            title=title,
            message=message,
            date=metrics.date,
            temp_min=metrics.temp_min,
            temp_max=metrics.temp_max,
            precipitation_mm=precip,
            wind_speed_ms=metrics.wind_speed_ms,
        )
    ]


def _wind_spray_advisory(metrics: ForecastDayMetrics) -> list[WeatherAdvisory]:
    wind = metrics.wind_speed_ms
    if wind is None:
        return []
    if wind >= STRONG_WIND_MS:
        severity: Severity = 'warning'
        title = 'Сильный ветер'
        message = (
            f'На {metrics.date} ветер до {wind:.1f} м/с '
            f'(≥ {STRONG_WIND_MS:.0f} м/с) — опрыскивание/распыление нежелательно.'
        )
    elif wind >= MODERATE_WIND_MS:
        severity = 'info'
        title = 'Ветер'
        message = (
            f'На {metrics.date} ветер около {wind:.1f} м/с '
            f'(≥ {MODERATE_WIND_MS:.0f} м/с) — осторожно при работах с распылением.'
        )
    else:
        return []
    return [
        WeatherAdvisory(
            code='strong_wind_spray',
            severity=severity,
            title=title,
            message=message,
            date=metrics.date,
            temp_min=metrics.temp_min,
            temp_max=metrics.temp_max,
            precipitation_mm=metrics.precipitation_mm,
            wind_speed_ms=wind,
        )
    ]


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


__all__ = [
    'FROST_TEMP_C',
    'ForecastDayMetrics',
    'HEAVY_RAIN_MM',
    'MODERATE_RAIN_MM',
    'MODERATE_WIND_MS',
    'STRONG_WIND_MS',
    'WeatherAdvisory',
    'build_advisories_for_plan',
    'is_spray_work',
    'iter_plan_dates',
    'max_wind_from_day_forecast',
    'merge_wind',
    'metrics_from_month_days',
]
