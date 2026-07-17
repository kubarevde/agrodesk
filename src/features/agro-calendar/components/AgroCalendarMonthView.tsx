import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { useFields } from '@/features/fields/hooks'
import { humanLabel } from '@/lib/display'
import { cn } from '@/lib/utils'
import { useAgroPlans } from '../hooks'
import type { AgroPlan } from '../types'
import { expandPlanDayKeys, planFieldsLabel, workTypeBadgeClass } from '../utils'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type AgroCalendarMonthViewProps = {
  month: Date
  fieldId?: string
  onPrevMonth: () => void
  onNextMonth: () => void
  onFieldChange: (fieldId: string | undefined) => void
  onSelectPlan: (plan: AgroPlan) => void
  onSelectDay: (dayKey: string) => void
}

export function AgroCalendarMonthView({
  month,
  fieldId,
  onPrevMonth,
  onNextMonth,
  onFieldChange,
  onSelectPlan,
  onSelectDay,
}: AgroCalendarMonthViewProps) {
  const monthKey = format(month, 'yyyy-MM')
  const { data: plans = [], isLoading } = useAgroPlans({ month: monthKey, fieldId })
  const { data: fields = [] } = useFields()

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const plansByDay = useMemo(() => {
    const map = new Map<string, AgroPlan[]>()
    for (const plan of plans) {
      for (const key of expandPlanDayKeys(plan.plannedDate, plan.plannedEndDate)) {
        const list = map.get(key) ?? []
        if (!list.some((item) => item.id === plan.id)) {
          list.push(plan)
          map.set(key, list)
        }
      }
    }
    return map
  }, [plans])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onPrevMonth}>
            ← Предыдущий месяц
          </Button>
          <p className="min-w-36 text-center text-sm font-semibold capitalize text-foreground">
            {format(month, 'LLLL yyyy', { locale: ru })}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onNextMonth}>
            Следующий месяц →
          </Button>
        </div>

        <Select
          value={fieldId ?? 'all'}
          onValueChange={(value) => onFieldChange(!value || value === 'all' ? undefined : value)}
          items={[
            { value: 'all', label: 'Все поля' },
            ...fields.map((field) => ({ value: field.id, label: field.name })),
          ]}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Все поля" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все поля</SelectItem>
            {fields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : (
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
                  <p
                    className={cn(
                      'mb-1 text-xs font-medium',
                      inMonth ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </p>
                  <div className="space-y-1">
                    {dayPlans.slice(0, 2).map((plan) => (
                      <button
                        key={`${plan.id}-${key}`}
                        type="button"
                        className="w-full rounded-md border border-border/60 bg-background/80 p-1 text-left hover:bg-muted/50"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectPlan(plan)
                        }}
                      >
                        <p
                          className={cn(
                            'truncate text-[10px] font-medium',
                            workTypeBadgeClass(humanLabel(plan.workTypeName, 'Работа')),
                          )}
                        >
                          {humanLabel(plan.workTypeName, 'Работа')}
                        </p>
                        <p className="truncate text-[9px] text-muted-foreground">
                          {planFieldsLabel(plan)}
                        </p>
                        <p className="truncate text-[9px] text-muted-foreground">
                          {[plan.equipmentName, plan.implementName]
                            .filter(Boolean)
                            .join(' · ') || 'Без техники'}
                        </p>
                        {plan.notes ? (
                          <p className="truncate text-[9px] text-muted-foreground">{plan.notes}</p>
                        ) : null}
                      </button>
                    ))}
                    {dayPlans.length > 2 ? (
                      <p className="text-[10px] text-muted-foreground">+{dayPlans.length - 2} ещё</p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
