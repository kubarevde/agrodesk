import { format, isSameMonth, isToday } from 'date-fns'
import { DayWeatherBadge } from '@/features/weather/components/DayWeatherBadge'
import type { WeatherDay } from '@/features/weather/types'
import { humanLabel } from '@/lib/display'
import { cn } from '@/lib/utils'
import type { AgroPlan } from '../types'
import { ENTRY_KIND_LABELS, STATUS_LABELS } from '../types'
import {
  isCalendarFact,
  planFieldsLabel,
} from '../utils'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type DesktopMonthGridProps = {
  days: Date[]
  month: Date
  plansByDay: Map<string, AgroPlan[]>
  weatherByDay: Map<string, WeatherDay>
  onSelectDay: (dayKey: string) => void
  onSelectPlan: (plan: AgroPlan) => void
}

/** 7-column month grid for desktop/tablet — intentionally wide, scroll contained. */
export function DesktopMonthGrid({
  days,
  month,
  plansByDay,
  weatherByDay,
  onSelectDay,
  onSelectPlan,
}: DesktopMonthGridProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="grid min-w-[700px] grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid min-w-[700px] grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayPlans = plansByDay.get(key) ?? []
          const weather = weatherByDay.get(key)
          const inMonth = isSameMonth(day, month)

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              className={cn(
                'min-h-24 cursor-pointer border-b border-r border-border p-1.5 transition-colors hover:bg-muted/30',
                !inMonth && 'bg-muted/20',
                isToday(day) && 'bg-primary/5',
              )}
              onClick={() => onSelectDay(key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectDay(key)
                }
              }}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <p
                  className={cn(
                    'text-xs font-medium',
                    inMonth ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {format(day, 'd')}
                </p>
                {inMonth ? <DayWeatherBadge day={weather} /> : null}
              </div>
              <div className="space-y-1">
                {dayPlans.slice(0, 2).map((plan) => {
                  const fact = isCalendarFact(plan)
                  return (
                    <button
                      key={`${plan.id}-${key}`}
                      type="button"
                      className={cn(
                        'w-full rounded-md border p-1 text-left hover:bg-muted/50',
                        fact
                          ? 'border-success/40 bg-success/5'
                          : 'border-border/60 bg-background/80',
                      )}
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectPlan(plan)
                      }}
                    >
                      <p className="truncate text-[9px] font-medium text-muted-foreground">
                        {fact ? ENTRY_KIND_LABELS.fact : ENTRY_KIND_LABELS.plan}
                        {` · ${STATUS_LABELS[plan.status]}`}
                      </p>
                      <p className="truncate text-[10px] font-medium text-foreground">
                        {humanLabel(plan.workTypeName, 'Работа')}
                      </p>
                      <p className="truncate text-[9px] text-muted-foreground">
                        {planFieldsLabel(plan)}
                      </p>
                    </button>
                  )
                })}
                {dayPlans.length > 2 ? (
                  <p className="text-[10px] text-muted-foreground">+{dayPlans.length - 2} ещё</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
