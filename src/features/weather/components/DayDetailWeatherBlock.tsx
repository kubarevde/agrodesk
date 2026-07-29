import { CloudOff } from 'lucide-react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { WeatherDaySourceDetail } from '../types'
import { DailySummaryRow, PeriodRow } from './WeatherPeriodRows'

type SourceCardProps = {
  source: WeatherDaySourceDetail
  compact: boolean
}

function SourceCard({ source, compact }: SourceCardProps) {
  if (!source.ok) {
    return (
      <p className="text-[11px] leading-snug text-muted-foreground sm:rounded-lg sm:border sm:border-border sm:bg-muted/20 sm:px-3 sm:py-2 sm:text-xs">
        <span className="font-medium text-foreground">{source.name}</span>
        {' — '}
        {source.error?.trim() || 'данные недоступны'}
      </p>
    )
  }

  const hasHourly =
    source.detailLevel === 'hourly' ||
    Boolean(source.morning || source.day || source.evening)
  const dailyOnly = !hasHourly && Boolean(source.dailySummary)

  return (
    <div className="rounded-lg border border-border bg-card px-2 py-1.5 sm:px-3 sm:py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <p className="text-xs font-medium text-foreground sm:text-sm">{source.name}</p>
        {dailyOnly ? (
          <p className="text-[11px] text-muted-foreground">только суточная сводка</p>
        ) : null}
      </div>
      {hasHourly ? (
        <div className="mt-1.5 grid grid-cols-3 gap-1 sm:mt-2 sm:gap-2">
          <PeriodRow label="Утро" slot={source.morning} compact={compact} />
          <PeriodRow label="День" slot={source.day} compact={compact} />
          <PeriodRow label="Вечер" slot={source.evening} compact={compact} />
        </div>
      ) : null}
      {source.dailySummary ? (
        <div className="mt-1.5 sm:mt-2">
          <DailySummaryRow slot={source.dailySummary} collapsible={compact} />
        </div>
      ) : null}
    </div>
  )
}

type DayDetailWeatherBlockProps = {
  sources: WeatherDaySourceDetail[] | undefined
  fieldName?: string
  isLoading: boolean
  isError: boolean
  unavailable?: boolean
  message?: string | null
}

/** Compact per-source morning / midday / evening forecast for the day sheet. */
export function DayDetailWeatherBlock({
  sources,
  fieldName,
  isLoading,
  isError,
  unavailable,
  message,
}: DayDetailWeatherBlockProps) {
  const compact = useIsMobile(639)

  if (isLoading) {
    return (
      <div className="space-y-1.5" aria-busy>
        <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        <div className="h-16 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-8 animate-pulse rounded-lg bg-muted/40" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <CloudOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          Не удалось загрузить подробный прогноз на этот день. Обычно это значит, что API
          без маршрута <span className="font-mono">/api/weather/day</span> — перезапустите
          backend на порту, куда смотрит Vite (по умолчанию 8000).
        </p>
      </div>
    )
  }

  if (!sources?.length || unavailable) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <CloudOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>{message?.trim() || 'Подробный прогноз на этот день недоступен.'}</p>
      </div>
    )
  }

  const okSources = sources.filter((source) => source.ok)
  const failedSources = sources.filter((source) => !source.ok)
  const trimmedField = fieldName?.trim()
  const title = trimmedField
    ? `Подробный прогноз на поле: "${trimmedField}"`
    : 'Подробный прогноз на выбранную дату'

  return (
    <section className="space-y-1.5 sm:space-y-2" aria-label={title}>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className="space-y-1.5 sm:space-y-2">
        {okSources.map((source) => (
          <SourceCard key={source.id} source={source} compact={compact} />
        ))}
        {failedSources.map((source) => (
          <SourceCard key={source.id} source={source} compact={compact} />
        ))}
      </div>
    </section>
  )
}
