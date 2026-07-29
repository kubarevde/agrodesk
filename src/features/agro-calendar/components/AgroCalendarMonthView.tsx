import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useMemo } from 'react'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { useFields } from '@/features/fields/hooks'
import { WeatherSourcesBanner } from '@/features/weather/components/WeatherSourcesBanner'
import { useFieldMonthWeather } from '@/features/weather/hooks'
import type { WeatherDay } from '@/features/weather/types'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useAgroPlans } from '../hooks'
import type { AgroPlan } from '../types'
import { expandPlanDayKeys } from '../utils'
import { AgroCalendarMonthToolbar } from './AgroCalendarMonthToolbar'
import { DesktopMonthGrid } from './DesktopMonthGrid'
import { MobileMonthGrid } from './MobileMonthGrid'

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
  const {
    data: weather,
    isLoading: weatherLoading,
    isError: weatherError,
  } = useFieldMonthWeather(monthKey, fieldId)

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

  const weatherByDay = useMemo(() => {
    const map = new Map<string, WeatherDay>()
    for (const day of weather?.days ?? []) {
      map.set(day.date, day)
    }
    return map
  }, [weather])

  return (
    <div className="space-y-4">
      <WeatherSourcesBanner
        weather={weather}
        isLoading={weatherLoading}
        isError={weatherError}
      />
      <AgroCalendarMonthToolbar
        month={month}
        fieldId={fieldId}
        fields={fields}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onFieldChange={onFieldChange}
      />

      {isLoading ? (
        <PageSkeleton />
      ) : isMobile ? (
        <MobileMonthGrid
          days={days}
          month={month}
          plansByDay={plansByDay}
          weatherByDay={weatherByDay}
          onSelectDay={onSelectDay}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
        />
      ) : (
        <DesktopMonthGrid
          days={days}
          month={month}
          plansByDay={plansByDay}
          weatherByDay={weatherByDay}
          onSelectDay={onSelectDay}
          onSelectPlan={onSelectPlan}
        />
      )}
    </div>
  )
}
