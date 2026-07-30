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
import { plansHaveAdvisories } from '../advisoryUi'
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

  const hasPlanAdvisories = plansHaveAdvisories(plans)

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

      {hasPlanAdvisories ? (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground"
          role="status"
        >
          <p className="font-medium text-destructive">Погодное предупреждение</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            У части планов есть риск по прогнозу (мороз, осадки, ветер при опрыскивании).
            Откройте день или карточку плана — метка с пояснением.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Когда появляется «Погодное предупреждение»</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Только у открытых планов (не «Выполнено» / «Отменено» и не факт смены)</li>
            <li>У поля должны быть координаты или контур</li>
            <li>
              Пороги: заморозки &lt; 0°C; осадки ≥ 5 мм (иконка дождя сама по себе не
              считается); при опрыскивании ещё ветер ≥ 5 м/с
            </li>
            <li>Нужен интернет; офлайн метка не показывается</li>
          </ul>
        </div>
      )}

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
