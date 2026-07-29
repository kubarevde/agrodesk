from pydantic import BaseModel, Field


class WeatherSourceStatus(BaseModel):
    id: str
    name: str
    ok: bool
    error: str | None = None
    daysCount: int = 0


class WeatherDay(BaseModel):
    date: str
    tempMax: float
    tempMin: float
    weatherCode: int
    weatherLabel: str
    precipitationMm: float | None = None
    sourceCount: int
    sourceIds: list[str] = Field(default_factory=list)


class FieldWeatherMonthResponse(BaseModel):
    fieldId: str
    fieldName: str
    latitude: float
    longitude: float
    year: int
    month: int
    fetchedAt: str
    cacheHit: bool
    sourcesUsed: int
    sourcesTotal: int
    sources: list[WeatherSourceStatus]
    days: list[WeatherDay]
    unavailable: bool = False
    message: str | None = None
    recommendationsAvailable: bool = False
    recommendationsNote: str | None = None


class WeatherPeriodSlot(BaseModel):
    period: str
    time: str | None = None
    temp: float
    weatherCode: int
    weatherLabel: str
    precipitationMm: float | None = None
    windSpeedMs: float | None = None
    tempMin: float | None = None
    tempMax: float | None = None
    resolution: str = 'hourly'


class WeatherDaySourceDetail(BaseModel):
    id: str
    name: str
    ok: bool
    error: str | None = None
    # Midday point (~12:00 local) — not a full-day aggregate.
    day: WeatherPeriodSlot | None = None
    morning: WeatherPeriodSlot | None = None
    evening: WeatherPeriodSlot | None = None
    # Optional full-day min/max summary (explicitly separate from «День»).
    dailySummary: WeatherPeriodSlot | None = None
    detailLevel: str = 'none'


class FieldWeatherDayResponse(BaseModel):
    fieldId: str
    fieldName: str
    latitude: float
    longitude: float
    date: str
    fetchedAt: str
    cacheHit: bool
    sourcesUsed: int
    sourcesTotal: int
    sources: list[WeatherDaySourceDetail]
    unavailable: bool = False
    message: str | None = None
