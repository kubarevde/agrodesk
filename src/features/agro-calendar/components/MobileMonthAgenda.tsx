import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { humanLabel } from '@/lib/display'
import { cn } from '@/lib/utils'
import type { AgroPlan } from '../types'
import { ENTRY_KIND_LABELS, STATUS_LABELS } from '../types'
import {
  entryKindBadgeClass,
  isCalendarFact,
  planFieldsLabel,
  statusBadgeClass,
} from '../utils'

type MobileMonthAgendaProps = {
  days: Date[]
  plansByDay: Map<string, AgroPlan[]>
  onSelectDay: (dayKey: string) => void
  onSelectPlan: (plan: AgroPlan) => void
}

/** Vertical day agenda for mobile — replaces 700px month grid. */
export function MobileMonthAgenda({
  days,
  plansByDay,
  onSelectDay,
  onSelectPlan,
}: MobileMonthAgendaProps) {
  if (days.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
        В этом месяце нет запланированных работ. Переключитесь на список или добавьте план.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const key = format(day, 'yyyy-MM-dd')
        const dayPlans = plansByDay.get(key) ?? []
        return (
          <section key={key} className="rounded-lg border border-border bg-surface">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-2 border-b border-border px-4 py-3 text-left"
              onClick={() => onSelectDay(key)}
            >
              <span className="font-medium capitalize text-foreground">
                {format(day, 'EEEE, d MMMM', { locale: ru })}
              </span>
              <span className="text-xs text-muted-foreground">{dayPlans.length}</span>
            </button>
            <ul className="divide-y divide-border">
              {dayPlans.map((plan) => {
                const fact = isCalendarFact(plan)
                return (
                  <li key={`${plan.id}-${key}`}>
                    <button
                      type="button"
                      className={cn(
                        'flex min-h-11 w-full flex-col gap-1.5 px-4 py-3 text-left hover:bg-muted/40',
                        fact && 'bg-success/5',
                      )}
                      onClick={() => onSelectPlan(plan)}
                    >
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={entryKindBadgeClass(plan.entryKind)}>
                          {fact ? ENTRY_KIND_LABELS.fact : ENTRY_KIND_LABELS.plan}
                        </Badge>
                        <Badge variant="outline" className={statusBadgeClass(plan.status)}>
                          {STATUS_LABELS[plan.status]}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {humanLabel(plan.workTypeName, 'Работа')}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {planFieldsLabel(plan)}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {fact
                          ? [plan.employeeName, plan.equipmentName, plan.implementName]
                              .filter(Boolean)
                              .join(' · ') || 'Факт выполнения'
                          : [plan.equipmentName, plan.implementName].filter(Boolean).join(' · ') ||
                            'Без техники'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
