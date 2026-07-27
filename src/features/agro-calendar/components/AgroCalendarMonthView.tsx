import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useAgroPlans } from '../hooks'
import type { AgroPlan } from '../types'
import { expandPlanDayKeys } from '../utils'
import { DesktopMonthGrid } from './DesktopMonthGrid'
import { MobileMonthAgenda } from './MobileMonthAgenda'

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
  const isMobile = useIsMobile(639)
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

  const monthDaysWithPlans = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    }).filter((day) => (plansByDay.get(format(day, 'yyyy-MM-dd'))?.length ?? 0) > 0)
  }, [month, plansByDay])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0 sm:hidden"
            aria-label="Предыдущий месяц"
            onClick={onPrevMonth}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={onPrevMonth}
          >
            ← Предыдущий месяц
          </Button>
          <p className="min-w-0 flex-1 text-center text-sm font-semibold capitalize text-foreground sm:min-w-36 sm:flex-none">
            {format(month, 'LLLL yyyy', { locale: ru })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0 sm:hidden"
            aria-label="Следующий месяц"
            onClick={onNextMonth}
          >
            <ChevronRight className="size-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={onNextMonth}
          >
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
      ) : isMobile ? (
        <MobileMonthAgenda
          days={monthDaysWithPlans}
          plansByDay={plansByDay}
          onSelectDay={onSelectDay}
          onSelectPlan={onSelectPlan}
        />
      ) : (
        <DesktopMonthGrid
          days={days}
          month={month}
          plansByDay={plansByDay}
          onSelectDay={onSelectDay}
          onSelectPlan={onSelectPlan}
        />
      )}
    </div>
  )
}
