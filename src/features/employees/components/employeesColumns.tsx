import type { ColumnDef } from '@tanstack/react-table'
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

export interface EmployeeRowActions {
  onEdit: (employee: Employee) => void
  onToggleActive: (employee: Employee) => void
}

export function createEmployeeColumns(
  actions: EmployeeRowActions | null,
  employeeIdsWithRates: Set<string>,
): ColumnDef<Employee>[] {
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: 'employeeCode',
      header: 'Код',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.employeeCode}</span>,
    },
    {
      accessorKey: 'employeeName',
      header: 'ФИО',
      cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span>,
    },
    {
      accessorKey: 'position',
      header: 'Должность',
      cell: ({ row }) => row.original.position || '—',
    },
    {
      id: 'rateBadge',
      header: 'Базовая ставка',
      cell: ({ row }) =>
        employeeIdsWithRates.has(row.original.id) ? (
          <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
            Ставки ✓
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {row.original.hourlyRate.toLocaleString('ru-RU')}₽
          </Badge>
        ),
    },
    {
      id: 'telegram',
      header: 'TG',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.telegramId.trim()
              ? 'border-success/40 bg-success/10 text-success'
              : 'text-muted-foreground'
          }
        >
          {row.original.telegramId.trim() ? 'TG ✓' : 'TG —'}
        </Badge>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Роль',
      cell: ({ row }) => (
        <Badge variant="outline" className={getRoleBadgeClass(row.original.role)}>
          {ROLE_LABELS[row.original.role]}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Статус',
      cell: ({ row }) => (
        <Badge variant="outline" className={getStatusBadgeClass(row.original.isActive)}>
          {getStatusLabel(row.original.isActive)}
        </Badge>
      ),
    },
  ]

  if (actions) {
    columns.push({
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Действия"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation()
                actions.onEdit(row.original)
              }}
            >
              <Pencil className="size-4" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation()
                actions.onToggleActive(row.original)
              }}
            >
              {row.original.isActive ? (
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
      ),
    })
  }

  return columns
}
