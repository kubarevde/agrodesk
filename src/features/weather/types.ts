export type WeatherSourceStatus = {
  id: string
  name: string
  ok: boolean
  error: string | null
  daysCount: number
}

export type WeatherDay = {
  date: string
  tempMax: number
  tempMin: number
  weatherCode: number
  weatherLabel: string
  precipitationMm: number | null
  sourceCount: number
  sourceIds: string[]
}

export type FieldWeatherMonth = {
  fieldId: string
  fieldName: string
  latitude: number
  longitude: number
  year: number
  month: number
  fetchedAt: string
  cacheHit: boolean
  sourcesUsed: number
  sourcesTotal: number
  sources: WeatherSourceStatus[]
  days: WeatherDay[]
  unavailable: boolean
  message: string | null
  recommendationsAvailable: boolean
  recommendationsNote: string | null
}

export type WeatherPeriodSlot = {
  period: string
  time: string | null
  temp: number
  weatherCode: number
  weatherLabel: string
  precipitationMm: number | null
  windSpeedMs: number | null
  tempMin?: number | null
  tempMax?: number | null
  resolution?: 'hourly' | 'daily' | string
}

export type WeatherDaySourceDetail = {
  id: string
  name: string
  ok: boolean
  error: string | null
  /** Midday ≈ 12:00 local — not a full-day aggregate. */
  day: WeatherPeriodSlot | null
  morning: WeatherPeriodSlot | null
  evening: WeatherPeriodSlot | null
  /** Optional full-day min/max summary (explicitly separate from «День»). */
  dailySummary?: WeatherPeriodSlot | null
  detailLevel: 'hourly' | 'daily' | 'none' | string
}

export type FieldWeatherDay = {
  fieldId: string
  fieldName: string
  latitude: number
  longitude: number
  date: string
  fetchedAt: string
  cacheHit: boolean
  sourcesUsed: number
  sourcesTotal: number
  sources: WeatherDaySourceDetail[]
  unavailable: boolean
  message: string | null
}
