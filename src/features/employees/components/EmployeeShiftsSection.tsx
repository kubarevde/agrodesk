import { CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import type { EmployeeMonthStats } from '@/features/employees/hooks'
import { getStatusBadgeClass } from '@/features/employees/utils'
import { formatShiftTime } from '@/features/worktime/utils'

type EmployeeShiftsSectionProps = {
  stats: EmployeeMonthStats | undefined
  isLoading: boolean
}

export function EmployeeShiftsSection({ stats, isLoading }: EmployeeShiftsSectionProps) {
  return (
    <section className="min-w-0 space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Смены</h2>
        {isLoading ? (
          <Skeleton className="h-5 w-48" />
        ) : (
          <p className="text-sm text-muted-foreground">
            За месяц: {stats?.shiftsCount ?? 0} смен · {stats?.totalHours ?? 0} ч
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : stats?.recentShifts.length ? (
        <ul className="space-y-2">
          {stats.recentShifts.map((shift) => (
            <li
              key={shift.id}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{shift.date}</span>
                <Badge
                  variant="outline"
                  className={getStatusBadgeClass(shift.status === 'open')}
                >
                  {shift.status === 'open' ? 'Открыта' : 'Закрыта'}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">
                {shift.location} / {shift.workType}
              </p>
              <p className="text-muted-foreground">
                {formatShiftTime(shift.startTime)} →{' '}
                {shift.endTime ? formatShiftTime(shift.endTime) : '…'}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={CalendarClock}
          title="Смен за месяц нет"
          description="Когда сотрудник закроет смену, она появится здесь"
        />
      )}
    </section>
  )
}
