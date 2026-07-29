import { cn } from '@/lib/utils'
import type { WeatherDay } from '../types'
import { formatTemp, weatherIcon } from '../utils'

type DayWeatherBadgeProps = {
  day: WeatherDay | undefined
  compact?: boolean
  className?: string
}

export function DayWeatherBadge({ day, compact = false, className }: DayWeatherBadgeProps) {
  if (!day) return null
  const Icon = weatherIcon(day.weatherCode)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-muted-foreground',
        compact ? 'text-[9px] leading-none' : 'text-[10px]',
        className,
      )}
      title={`${day.weatherLabel}: ${formatTemp(day.tempMin)}…${formatTemp(day.tempMax)}`}
    >
      <Icon className={cn(compact ? 'size-2.5' : 'size-3')} aria-hidden />
      <span className="tabular-nums text-foreground">{formatTemp(day.tempMax)}</span>
    </span>
  )
}
