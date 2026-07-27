import { MoreHorizontal, Pencil, UserCheck, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Employee } from '@/types'
import {
  ROLE_LABELS,
  getRoleBadgeClass,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/features/employees/utils'
import type { EmployeeRowActions } from './employeesColumns'

type EmployeesMobileListProps = {
  employees: Employee[]
  actions: EmployeeRowActions | null
  onRowClick: (employee: Employee) => void
  employeeIdsWithRates: Set<string>
}

/** Mobile card list — same data/actions as desktop table, no page-level h-scroll. */
export function EmployeesMobileList({
  employees,
  actions,
  onRowClick,
  employeeIdsWithRates,
}: EmployeesMobileListProps) {
  return (
    <ul className="space-y-3 md:hidden">
      {employees.map((employee) => (
        <li key={employee.id}>
          <button
            type="button"
            className="w-full rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-muted/40"
            onClick={() => onRowClick(employee)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{employee.employeeName}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {employee.employeeCode}
                  {employee.position ? ` · ${employee.position}` : ''}
                </p>
              </div>
              {actions ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                    aria-label="Действия"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation()
                        actions.onEdit(employee)
                      }}
                    >
                      <Pencil className="size-4" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation()
                        actions.onToggleActive(employee)
                      }}
                    >
                      {employee.isActive ? (
                        <>
                          <UserX className="size-4" />
                          Деактивировать
                        </>
                      ) : (
                        <>
                          <UserCheck className="size-4" />
                          Активировать
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className={getRoleBadgeClass(employee.role)}>
                {ROLE_LABELS[employee.role]}
              </Badge>
              <Badge variant="outline" className={getStatusBadgeClass(employee.isActive)}>
                {getStatusLabel(employee.isActive)}
              </Badge>
              <Badge
                variant="outline"
                className={
                  employee.telegramId.trim()
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'text-muted-foreground'
                }
              >
                {employee.telegramId.trim() ? 'TG ✓' : 'TG —'}
              </Badge>
              {employeeIdsWithRates.has(employee.id) ? (
                <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                  Ставки ✓
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  {employee.hourlyRate.toLocaleString('ru-RU')}₽
                </Badge>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
