import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CloudOff } from 'lucide-react'
import type { FieldWeatherMonth } from '../types'

type WeatherSourcesBannerProps = {
  weather: FieldWeatherMonth | undefined
  isLoading: boolean
  isError: boolean
}

export function WeatherSourcesBanner({
  weather,
  isLoading,
  isError,
}: WeatherSourcesBannerProps) {
  if (isLoading) {
    return (
      <div className="h-10 animate-pulse rounded-md bg-muted/60" aria-hidden />
    )
  }

  if (isError || !weather) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <CloudOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>Прогноз погоды временно недоступен. Координаты поля и внешние API не подменены.</p>
      </div>
    )
  }

  const updated = (() => {
    try {
      return format(new Date(weather.fetchedAt), 'd MMM, HH:mm', { locale: ru })
    } catch {
      return weather.fetchedAt
    }
  })()

  const sourceNames = weather.sources
    .map((source) => `${source.name}${source.ok ? '' : ' (нет ответа)'}`)
    .join(', ')

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
      <p className="text-foreground">
        Погода: {weather.fieldName}
        <span className="text-muted-foreground">
          {' '}
          ({weather.latitude.toFixed(2)}, {weather.longitude.toFixed(2)})
        </span>
      </p>
      <p className="mt-0.5">
        Источники: {sourceNames}. Использовано {weather.sourcesUsed} из{' '}
        {weather.sourcesTotal}. Обновлено: {updated}.
      </p>
      {weather.unavailable ? (
        <p className="mt-0.5 text-destructive">{weather.message}</p>
      ) : null}
    </div>
  )
}
