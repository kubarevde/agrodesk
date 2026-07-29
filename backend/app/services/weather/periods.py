"""Pick morning / midday / evening slots from hourly samples (real data only).

Semantic targets (local field time):
- Утро  ≈ 08:00
- День  ≈ 12:00  (midday — NOT a full-day summary)
- Вечер ≈ 20:00

Full-day min/max aggregates live in a separate daily_summary slot.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.services.weather.aggregate import pick_weather_code
from app.services.weather.codes import wmo_label

MORNING_TARGET_HOUR = 8
DAY_TARGET_HOUR = 12
EVENING_TARGET_HOUR = 20
MORNING_WINDOW = range(6, 11)  # 06–10 inclusive
DAY_WINDOW = range(11, 14)  # 11–13 inclusive
EVENING_WINDOW = range(18, 23)  # 18–22 inclusive


@dataclass(frozen=True)
class HourlySample:
    local_time: datetime
    temp: float
    weather_code: int
    precipitation_mm: float | None = None
    wind_speed_ms: float | None = None


@dataclass(frozen=True)
class PeriodSlot:
    period: str  # morning | day | evening | daily_summary
    time: str | None
    temp: float
    weather_code: int
    weather_label: str
    precipitation_mm: float | None = None
    wind_speed_ms: float | None = None
    temp_min: float | None = None
    temp_max: float | None = None
    resolution: str = 'hourly'  # hourly | daily

    def to_dict(self) -> dict:
        return {
            'period': self.period,
            'time': self.time,
            'temp': round(self.temp, 1),
            'weatherCode': self.weather_code,
            'weatherLabel': self.weather_label,
            'precipitationMm': (
                round(self.precipitation_mm, 1) if self.precipitation_mm is not None else None
            ),
            'windSpeedMs': (
                round(self.wind_speed_ms, 1) if self.wind_speed_ms is not None else None
            ),
            'tempMin': round(self.temp_min, 1) if self.temp_min is not None else None,
            'tempMax': round(self.temp_max, 1) if self.temp_max is not None else None,
            'resolution': self.resolution,
        }


def _pick_closest(samples: list[HourlySample], target_hour: int, window: range) -> HourlySample | None:
    candidates = [s for s in samples if s.local_time.hour in window]
    if not candidates:
        return None
    return min(candidates, key=lambda s: abs(s.local_time.hour - target_hour))


def _slot_from_sample(period: str, sample: HourlySample) -> PeriodSlot:
    return PeriodSlot(
        period=period,
        time=sample.local_time.strftime('%H:%M'),
        temp=sample.temp,
        weather_code=sample.weather_code,
        weather_label=wmo_label(sample.weather_code),
        precipitation_mm=sample.precipitation_mm,
        wind_speed_ms=sample.wind_speed_ms,
        resolution='hourly',
    )


def extract_day_periods(samples: list[HourlySample]) -> dict[str, PeriodSlot | None]:
    """Утро / День (полдень) / Вечер from hourly points near 08 / 12 / 20."""
    morning_s = _pick_closest(samples, MORNING_TARGET_HOUR, MORNING_WINDOW)
    day_s = _pick_closest(samples, DAY_TARGET_HOUR, DAY_WINDOW)
    evening_s = _pick_closest(samples, EVENING_TARGET_HOUR, EVENING_WINDOW)
    return {
        'morning': _slot_from_sample('morning', morning_s) if morning_s else None,
        'day': _slot_from_sample('day', day_s) if day_s else None,
        'evening': _slot_from_sample('evening', evening_s) if evening_s else None,
    }


# Back-compat alias used by older tests/imports during transition.
extract_morning_evening = extract_day_periods


def extract_daily_summary_from_hourly(samples: list[HourlySample]) -> PeriodSlot | None:
    """Honest full-day summary from hourly points (mean temp, min/max, majority weather)."""
    if not samples:
        return None
    temps = [s.temp for s in samples]
    codes = [s.weather_code for s in samples]
    precip_values = [s.precipitation_mm for s in samples if s.precipitation_mm is not None]
    wind_values = [s.wind_speed_ms for s in samples if s.wind_speed_ms is not None]
    code = pick_weather_code(codes)
    return PeriodSlot(
        period='daily_summary',
        time=None,
        temp=sum(temps) / len(temps),
        weather_code=code,
        weather_label=wmo_label(code),
        precipitation_mm=sum(precip_values) if precip_values else None,
        wind_speed_ms=sum(wind_values) / len(wind_values) if wind_values else None,
        temp_min=min(temps),
        temp_max=max(temps),
        resolution='hourly',
    )


# Back-compat name — previously mislabeled as period='day'.
extract_day_from_hourly = extract_daily_summary_from_hourly


def day_slot_from_daily(
    *,
    temp_max: float,
    temp_min: float,
    weather_code: int,
    precipitation_mm: float | None = None,
) -> PeriodSlot:
    """Daily summary from a provider's daily endpoint (not a midday point)."""
    return PeriodSlot(
        period='daily_summary',
        time=None,
        temp=(temp_max + temp_min) / 2,
        weather_code=weather_code,
        weather_label=wmo_label(weather_code),
        precipitation_mm=precipitation_mm,
        wind_speed_ms=None,
        temp_min=temp_min,
        temp_max=temp_max,
        resolution='daily',
    )
