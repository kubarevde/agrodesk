import { Pencil, UserCheck, UserX } from 'lucide-react'
import { useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
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
  const suppressNavRef = useRef(false)

  return (
    <ul className="space-y-3 md:hidden">
      {employees.map((employee) => (
        <li key={employee.id}>
          <button
            type="button"
            className="w-full rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-muted/40"
            onClick={() => {
              if (suppressNavRef.current) return
              onRowClick(employee)
            }}
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
                <CardActionsMenu
                  title={employee.employeeName}
                  ariaLabel="Действия"
                  actions={[
                    {
                      id: 'edit',
                      label: 'Редактировать',
                      icon: Pencil,
                      onSelect: () => actions.onEdit(employee),
                    },
                    {
                      id: 'toggle',
                      label: employee.isActive ? 'Деактивировать' : 'Активировать',
                      icon: employee.isActive ? UserX : UserCheck,
                      onSelect: () => actions.onToggleActive(employee),
                    },
                  ]}
                  onOpenChange={(menuOpen) => {
                    if (!menuOpen) {
                      suppressNavRef.current = true
                      window.setTimeout(() => {
                        suppressNavRef.current = false
                      }, 400)
                    }
                  }}
                />
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
