import type { WeatherPeriodSlot } from '../types'
import { formatTemp, weatherIcon } from '../utils'

type PeriodRowProps = {
  label: string
  slot: WeatherPeriodSlot | null
  /** Dense one-column cell for mobile 3-up grid. */
  compact?: boolean
}

export function PeriodRow({ label, slot, compact = false }: PeriodRowProps) {
  if (!slot) {
    return (
      <div
        className={
          compact
            ? 'min-w-0 rounded-md bg-muted/40 px-1.5 py-1 text-[11px] leading-tight text-muted-foreground'
            : 'min-w-0 rounded-md bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground'
        }
      >
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="mt-0.5 block">нет данных</span>
      </div>
    )
  }

  const Icon = weatherIcon(slot.weatherCode)
  const extras: string[] = []
  if (slot.precipitationMm != null && slot.precipitationMm > 0) {
    extras.push(`${slot.precipitationMm} мм`)
  }
  if (slot.windSpeedMs != null) {
    extras.push(`${slot.windSpeedMs} м/с`)
  }

  if (compact) {
    return (
      <div className="min-w-0 rounded-md bg-muted/40 px-1.5 py-1 text-[11px] leading-tight">
        <p className="font-medium text-foreground">
          {label}
          {slot.time ? (
            <span className="ml-0.5 font-normal text-muted-foreground">{slot.time}</span>
          ) : null}
        </p>
        <p className="mt-0.5 flex items-center gap-0.5 text-foreground">
          <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
          <span className="tabular-nums font-medium">{formatTemp(slot.temp)}</span>
        </p>
        <p className="truncate text-muted-foreground">{slot.weatherLabel}</p>
        {extras.length > 0 ? (
          <p className="truncate text-muted-foreground">{extras.join(' · ')}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="min-w-0 rounded-md bg-muted/40 px-2 py-1.5 text-xs">
      <p className="font-medium text-foreground">
        {label}
        {slot.time ? (
          <span className="ml-1 font-normal text-muted-foreground">({slot.time})</span>
        ) : null}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-foreground">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="tabular-nums font-medium">{formatTemp(slot.temp)}</span>
        <span className="text-muted-foreground">{slot.weatherLabel}</span>
      </p>
      {extras.length > 0 ? (
        <p className="mt-0.5 text-muted-foreground">{extras.join(' · ')}</p>
      ) : null}
    </div>
  )
}

export function DailySummaryRow({
  slot,
  collapsible = false,
}: {
  slot: WeatherPeriodSlot
  collapsible?: boolean
}) {
  const Icon = weatherIcon(slot.weatherCode)
  const range =
    slot.tempMin != null && slot.tempMax != null
      ? `${formatTemp(slot.tempMin)}…${formatTemp(slot.tempMax)}`
      : null

  const body = (
    <p className="mt-0.5 flex flex-wrap items-center gap-1 text-foreground">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="tabular-nums font-medium">{formatTemp(slot.temp)}</span>
      {range ? <span className="tabular-nums text-muted-foreground">{range}</span> : null}
      <span className="text-muted-foreground">{slot.weatherLabel}</span>
      {slot.precipitationMm != null && slot.precipitationMm > 0 ? (
        <span className="text-muted-foreground">· {slot.precipitationMm} мм</span>
      ) : null}
    </p>
  )

  if (collapsible) {
    return (
      <details className="min-w-0 rounded-md border border-dashed border-border px-2 py-1 text-[11px]">
        <summary className="cursor-pointer select-none font-medium text-muted-foreground">
          Сводка за сутки
        </summary>
        <div className="mt-1 text-xs">{body}</div>
      </details>
    )
  }

  return (
    <div className="min-w-0 rounded-md border border-dashed border-border px-2 py-1.5 text-xs">
      <p className="font-medium text-foreground">Сводка за сутки</p>
      {body}
    </div>
  )
}
