import { CalendarDays } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAgroPlansToday } from '@/features/agro-calendar/hooks'
import { STATUS_LABELS } from '@/features/agro-calendar/types'
import { statusBadgeClass } from '@/features/agro-calendar/utils'

type EmployeeAgroTodaySectionProps = {
  employeeId: string
}

export function EmployeeAgroTodaySection({ employeeId }: EmployeeAgroTodaySectionProps) {
  const { data: plans = [], isLoading } = useAgroPlansToday(employeeId)

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
  }

  if (plans.length === 0) return null

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Сегодня запланировано</h2>
      </div>
      <ul className="space-y-2">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-foreground">{plan.workTypeName}</p>
              <p className="text-xs text-muted-foreground">{plan.fieldName}</p>
            </div>
            <Badge className={statusBadgeClass(plan.status)}>{STATUS_LABELS[plan.status]}</Badge>
          </li>
        ))}
      </ul>
    </section>
  )
}
