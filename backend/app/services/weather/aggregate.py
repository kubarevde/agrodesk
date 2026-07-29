"""Pure aggregation of comparable weather metrics from multiple sources."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from app.services.weather.codes import severity, wmo_label


@dataclass(frozen=True)
class DayObservation:
    date: str  # YYYY-MM-DD
    temp_max: float
    temp_min: float
    weather_code: int
    precipitation_mm: float | None = None
    source_id: str = ''


@dataclass(frozen=True)
class AggregatedDay:
    date: str
    temp_max: float
    temp_min: float
    weather_code: int
    weather_label: str
    precipitation_mm: float | None
    source_count: int
    source_ids: list[str]


def pick_weather_code(codes: list[int]) -> int:
    """Majority vote; ties broken by higher severity (not arithmetic mean)."""
    if not codes:
        raise ValueError('no weather codes')
    counts = Counter(codes)
    max_count = max(counts.values())
    candidates = [code for code, count in counts.items() if count == max_count]
    return max(candidates, key=severity)


def aggregate_day(observations: list[DayObservation]) -> AggregatedDay | None:
    if not observations:
        return None
    temp_max = sum(o.temp_max for o in observations) / len(observations)
    temp_min = sum(o.temp_min for o in observations) / len(observations)
    code = pick_weather_code([o.weather_code for o in observations])
    precip_values = [o.precipitation_mm for o in observations if o.precipitation_mm is not None]
    precip = (
        sum(precip_values) / len(precip_values) if precip_values else None
    )
    source_ids = sorted({o.source_id for o in observations if o.source_id})
    return AggregatedDay(
        date=observations[0].date,
        temp_max=round(temp_max, 1),
        temp_min=round(temp_min, 1),
        weather_code=code,
        weather_label=wmo_label(code),
        precipitation_mm=round(precip, 1) if precip is not None else None,
        source_count=len(observations),
        source_ids=source_ids,
    )


def aggregate_by_date(
    observations: list[DayObservation],
) -> list[AggregatedDay]:
    by_date: dict[str, list[DayObservation]] = {}
    for obs in observations:
        by_date.setdefault(obs.date, []).append(obs)
    result: list[AggregatedDay] = []
    for day in sorted(by_date):
        aggregated = aggregate_day(by_date[day])
        if aggregated is not None:
            result.append(aggregated)
    return result
