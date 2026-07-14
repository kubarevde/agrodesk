import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import type { Employee } from '@/types'
import { useEmployee, useEmployeeMonthStats } from '@/features/employees/hooks'
import {
  ROLE_LABELS,
  getRoleBadgeClass,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/features/employees/utils'
import { formatShiftTime } from '@/features/worktime/utils'
import type { ReactNode } from 'react'

interface EmployeeDetailSheetProps {
  employee: Employee | null
  open: boolean
  onClose: () => void
}

interface DetailRowProps {
  label: string
  value: ReactNode
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm text-foreground">{value}</span>
    </div>
  )
}

export function EmployeeDetailSheet({ employee, open, onClose }: EmployeeDetailSheetProps) {
  const { data: detail, isLoading: detailLoading } = useEmployee(
    open ? employee?.id : undefined,
  )
  const { data: stats, isLoading: statsLoading } = useEmployeeMonthStats(
    open ? employee?.id : undefined,
  )

  const current = detail ?? employee

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {current ? (
          <>
            <SheetHeader>
              <SheetTitle>{current.employeeName}</SheetTitle>
              <SheetDescription>{current.employeeCode}</SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-6">
              {detailLoading && !detail ? (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <>
                  <DetailRow
                    label="Код"
                    value={<span className="font-mono">{current.employeeCode}</span>}
                  />
                  <DetailRow label="ФИО" value={current.employeeName} />
                  <DetailRow label="Должность" value={current.position || '—'} />
                  <DetailRow
                    label="Ставка"
                    value={`${current.hourlyRate.toLocaleString('ru-RU')} ₽/ч`}
                  />
                  <DetailRow
                    label="Роль"
                    value={
                      <Badge variant="outline" className={getRoleBadgeClass(current.role)}>
                        {ROLE_LABELS[current.role]}
                      </Badge>
                    }
                  />
                  <DetailRow
                    label="Статус"
                    value={
                      <Badge variant="outline" className={getStatusBadgeClass(current.isActive)}>
                        {getStatusLabel(current.isActive)}
                      </Badge>
                    }
                  />
                </>
              )}

              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Статистика за месяц</h3>
                {statsLoading ? (
                  <Skeleton className="h-5 w-48" />
                ) : (
                  <p className="text-sm text-foreground">
                    Смен за месяц: {stats?.shiftsCount ?? 0} | Часов: {stats?.totalHours ?? 0}
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Последние 5 смен</h3>
                {statsLoading ? (
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
                  <p className="text-sm text-muted-foreground">Смен за месяц нет</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
