import type { ColumnDef } from '@tanstack/react-table'
import { MessageCircle, MoreHorizontal, Pencil, UserX } from 'lucide-react'
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
  formatTelegramId,
  getRoleBadgeClass,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/features/employees/utils'

export interface EmployeeRowActions {
  onEdit: (employee: Employee) => void
  onDeactivate: (employee: Employee) => void
}

export function createEmployeeColumns(actions: EmployeeRowActions): ColumnDef<Employee>[] {
  return [
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
      cell: ({ row }) => row.original.position,
    },
    {
      accessorKey: 'hourlyRate',
      header: 'Ставка',
      cell: ({ row }) => `${row.original.hourlyRate.toLocaleString('ru-RU')} ₽/ч`,
    },
    {
      id: 'telegram',
      header: 'Telegram',
      cell: ({ row }) => {
        const telegramId = formatTelegramId(row.original.telegramId)
        if (telegramId === '—') {
          return <span className="text-muted-foreground">—</span>
        }

        return (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <MessageCircle className="size-3.5 text-primary" />
            {telegramId}
          </span>
        )
      },
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
    {
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
            {row.original.isActive ? (
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation()
                  actions.onDeactivate(row.original)
                }}
              >
                <UserX className="size-4" />
                Деактивировать
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
