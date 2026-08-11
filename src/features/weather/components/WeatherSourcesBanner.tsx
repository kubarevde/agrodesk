import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CloudOff } from 'lucide-react'
import type { FieldWeatherMonth } from '../types'

type WeatherSourcesBannerProps = {
  weather: FieldWeatherMonth | undefined
  isLoading: boolean
  isError: boolean
}

/** Compact weather meta line for calendar footer (coords, sources, update time). */
export function WeatherSourcesBanner({
  weather,
  isLoading,
  isError,
}: WeatherSourcesBannerProps) {
  if (isLoading) {
    return (
      <div
        className="h-4 w-full max-w-md animate-pulse rounded bg-muted/60"
        aria-hidden
      />
    )
  }

  if (isError || !weather) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
        <CloudOff className="size-3 shrink-0" aria-hidden />
        <span>Прогноз временно недоступен</span>
      </p>
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
    <footer
      className="text-[11px] leading-snug text-muted-foreground sm:text-xs"
      data-testid="weather-sources-footer"
    >
      <p className="break-words">
        <span className="text-foreground">{weather.fieldName}</span>
        <span>
          {' '}
          ({weather.latitude.toFixed(2)}, {weather.longitude.toFixed(2)})
        </span>
        <span className="text-muted-foreground/70"> · </span>
        <span>
          {sourceNames} ({weather.sourcesUsed}/{weather.sourcesTotal})
        </span>
        <span className="text-muted-foreground/70"> · </span>
        <span>обновлено {updated}</span>
        {weather.unavailable && weather.message ? (
          <>
            <span className="text-muted-foreground/70"> · </span>
            <span className="text-destructive">{weather.message}</span>
          </>
        ) : null}
      </p>
    </footer>
  )
}
