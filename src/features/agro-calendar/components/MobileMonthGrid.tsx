import { useRef } from 'react'
import { format, isSameMonth, isToday } from 'date-fns'
import { DayWeatherBadge } from '@/features/weather/components/DayWeatherBadge'
import type { WeatherDay } from '@/features/weather/types'
import { cn } from '@/lib/utils'
import { dayAdvisorySeverity } from '../advisoryUi'
import type { AgroPlan } from '../types'
import { isCalendarFact } from '../utils'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const SWIPE_THRESHOLD_PX = 48

type MobileMonthGridProps = {
  days: Date[]
  month: Date
  plansByDay: Map<string, AgroPlan[]>
  weatherByDay: Map<string, WeatherDay>
  onSelectDay: (dayKey: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

/**
 * Compact 7-column month grid for ~375px viewports.
 * Equal cells (no size growth for busy days) — events shown as dots + count badge.
 * Horizontal swipe changes month; tap opens day sheet (handled by parent).
 */
export function MobileMonthGrid({
  days,
  month,
  plansByDay,
  weatherByDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: MobileMonthGridProps) {
  const touchStartX = useRef<number | null>(null)

  return (
    <div
      className="overflow-hidden rounded-lg border border-border"
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current
        touchStartX.current = null
        if (start == null) return
        const end = event.changedTouches[0]?.clientX
        if (end == null) return
        const delta = end - start
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
        if (delta < 0) onNextMonth()
        else onPrevMonth()
      }}
    >
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayPlans = plansByDay.get(key) ?? []
          const weather = weatherByDay.get(key)
          const count = dayPlans.length
          const inMonth = isSameMonth(day, month)
          const hasFact = dayPlans.some((plan) => isCalendarFact(plan))
          const hasPlan = dayPlans.some((plan) => !isCalendarFact(plan))
          const advisorySeverity = inMonth ? dayAdvisorySeverity(dayPlans) : null

          return (
            <button
              key={key}
              type="button"
              aria-label={`${format(day, 'd MMMM')}${count ? `, задач: ${count}` : ''}${weather ? `, ${weather.weatherLabel} ${Math.round(weather.tempMax)}°` : ''}${advisorySeverity ? ', погодное предупреждение' : ''}`}
              className={cn(
                'flex aspect-square min-h-0 flex-col items-center justify-start gap-0 border-b border-r border-border p-0.5',
                'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !inMonth && 'bg-muted/25',
                isToday(day) && 'bg-primary/10',
                count > 0 && inMonth && 'bg-surface',
                advisorySeverity === 'warning' && inMonth && 'ring-1 ring-inset ring-destructive/40',
              )}
              onClick={() => onSelectDay(key)}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[11px] tabular-nums',
                  inMonth ? 'font-medium text-foreground' : 'text-muted-foreground/70',
                  isToday(day) && 'bg-primary font-semibold text-primary-foreground',
                  count > 0 && inMonth && !isToday(day) && 'font-semibold text-primary',
                )}
              >
                {format(day, 'd')}
              </span>

              {inMonth ? <DayWeatherBadge day={weather} compact className="mt-0.5" /> : null}

              {count > 0 || advisorySeverity ? (
                <span className="mt-0.5 flex items-center gap-0.5">
                  {hasPlan ? (
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                  ) : null}
                  {hasFact ? (
                    <span className="size-1.5 rounded-full bg-success" aria-hidden />
                  ) : null}
                  {advisorySeverity ? (
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        advisorySeverity === 'warning' ? 'bg-destructive' : 'bg-primary',
                      )}
                      title="Погодное предупреждение"
                      aria-hidden
                    />
                  ) : null}
                  {count > 1 ? (
                    <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="size-1.5" aria-hidden />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
