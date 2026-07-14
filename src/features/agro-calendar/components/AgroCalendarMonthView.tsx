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
import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/lib/utils'
import { useAgroPlans } from '../hooks'
import type { AgroPlan } from '../types'
import { workTypeBadgeClass } from '../utils'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type AgroCalendarMonthViewProps = {
  month: Date
  fieldId?: string
  onPrevMonth: () => void
  onNextMonth: () => void
  onFieldChange: (fieldId: string | undefined) => void
  onSelectPlan: (plan: AgroPlan) => void
}

export function AgroCalendarMonthView({
  month,
  fieldId,
  onPrevMonth,
  onNextMonth,
  onFieldChange,
  onSelectPlan,
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
      const startKey = plan.plannedDate.slice(0, 10)
      const endKey = (plan.plannedEndDate ?? plan.plannedDate).slice(0, 10)
      const rangeStart = startKey <= endKey ? startKey : endKey
      const rangeEnd = startKey <= endKey ? endKey : startKey
      for (const day of days) {
        const key = format(day, 'yyyy-MM-dd')
        if (key < rangeStart || key > rangeEnd) continue
        const list = map.get(key) ?? []
        if (!list.some((item) => item.id === plan.id)) {
          list.push(plan)
          map.set(key, list)
        }
      }
    }
    return map
  }, [days, plans])

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
                  className={cn(
                    'min-h-24 border-b border-r border-border p-1.5',
                    !inMonth && 'bg-muted/20',
                    isToday(day) && 'bg-primary/5',
                  )}
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
                    {dayPlans.slice(0, 3).map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        className="w-full text-left"
                        onClick={() => onSelectPlan(plan)}
                      >
                        <Badge
                          variant="outline"
                          className={cn('w-full justify-start truncate text-[10px]', workTypeBadgeClass(plan.workTypeName))}
                        >
                          {plan.workTypeName}
                        </Badge>
                      </button>
                    ))}
                    {dayPlans.length > 3 ? (
                      <p className="text-[10px] text-muted-foreground">+{dayPlans.length - 3} ещё</p>
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
