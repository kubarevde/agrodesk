import { useMemo } from 'react'
import type { CurrentUser } from '@/lib/transformers'
import { useShifts } from '@/features/worktime/hooks'
import { calcTotalHours, getDefaultMonthRange } from '@/features/worktime/utils'

interface MyStatsSectionProps {
  user: CurrentUser
}

export function MyStatsSection({ user }: MyStatsSectionProps) {
  const monthRange = useMemo(() => getDefaultMonthRange(), [])
  const filters = useMemo(
    () => ({
      employeeId: user.id,
      from: monthRange.from,
      to: monthRange.to,
    }),
    [monthRange.from, monthRange.to, user.id],
  )
  const { data: shifts = [], isLoading } = useShifts(filters)

  const closedShifts = shifts.filter((shift) => shift.status === 'closed')
  const hours = calcTotalHours(closedShifts)
  const payout = Math.round(hours * user.hourlyRate)

  if (isLoading) {
    return <div className="h-36 animate-pulse rounded-xl border border-border bg-muted/40" />
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold text-foreground">Моя статистика</h2>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Смен за этот месяц</dt>
          <dd className="text-xl font-semibold text-foreground">{shifts.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Часов</dt>
          <dd className="text-xl font-semibold text-foreground">{hours}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">К выплате</dt>
          <dd className="text-sm font-medium text-foreground">
            {hours} × {user.hourlyRate.toLocaleString('ru-RU')} ={' '}
            <span className="text-xl font-semibold">
              {payout.toLocaleString('ru-RU')} ₽
            </span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
