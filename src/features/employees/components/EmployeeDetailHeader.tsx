import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EntityHistoryButton } from '@/features/audit-log/components/EntityHistoryButton'
import type { Employee } from '@/types'
import {
  ROLE_LABELS,
  getRoleBadgeClass,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/features/employees/utils'

type EmployeeDetailHeaderProps = {
  employee: Employee
  isAdmin: boolean
  onEdit: () => void
  onToggleActive: () => void
}

export function EmployeeDetailHeader({
  employee,
  isAdmin,
  onEdit,
  onToggleActive,
}: EmployeeDetailHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h1 className="text-xl font-semibold break-words text-foreground sm:text-2xl">
          {employee.employeeName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={getStatusBadgeClass(employee.isActive)}>
            {getStatusLabel(employee.isActive)}
          </Badge>
          <Badge variant="outline" className={getRoleBadgeClass(employee.role)}>
            {ROLE_LABELS[employee.role]}
          </Badge>
          <span className="font-mono text-sm text-muted-foreground">
            {employee.employeeCode}
          </span>
          {employee.position ? (
            <span className="text-sm text-muted-foreground">{employee.position}</span>
          ) : null}
          <EntityHistoryButton entityType="employee" entityId={employee.id} />
        </div>
      </div>

      {isAdmin ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-10"
            onClick={onEdit}
          >
            Редактировать
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-10"
            onClick={onToggleActive}
          >
            {employee.isActive ? 'Деактивировать' : 'Активировать'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
