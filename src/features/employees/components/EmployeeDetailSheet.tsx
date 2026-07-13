import { MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'
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
import { useEmployeeMonthHours } from '@/features/employees/hooks'
import {
  ROLE_LABELS,
  formatTelegramId,
  getRoleBadgeClass,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/features/employees/utils'

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
  const { data: monthHours, isLoading } = useEmployeeMonthHours(employee?.employeeCode)

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {employee ? (
          <>
            <SheetHeader>
              <SheetTitle>{employee.employeeName}</SheetTitle>
              <SheetDescription>{employee.employeeCode}</SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-4">
              <DetailRow label="Код" value={<span className="font-mono">{employee.employeeCode}</span>} />
              <DetailRow label="ФИО" value={employee.employeeName} />
              <DetailRow label="Должность" value={employee.position} />
              <DetailRow
                label="Ставка"
                value={`${employee.hourlyRate.toLocaleString('ru-RU')} ₽/ч`}
              />
              <DetailRow
                label="Telegram"
                value={
                  formatTelegramId(employee.telegramId) === '—' ? (
                    '—'
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="size-3.5 text-primary" />
                      {employee.telegramId}
                    </span>
                  )
                }
              />
              <DetailRow
                label="Роль"
                value={
                  <Badge variant="outline" className={getRoleBadgeClass(employee.role)}>
                    {ROLE_LABELS[employee.role]}
                  </Badge>
                }
              />
              <DetailRow
                label="Статус"
                value={
                  <Badge variant="outline" className={getStatusBadgeClass(employee.isActive)}>
                    {getStatusLabel(employee.isActive)}
                  </Badge>
                }
              />
              <DetailRow
                label="Смены за последний месяц"
                value={
                  isLoading ? (
                    <Skeleton className="ml-auto h-4 w-12" />
                  ) : (
                    `${monthHours ?? 0} ч`
                  )
                }
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
