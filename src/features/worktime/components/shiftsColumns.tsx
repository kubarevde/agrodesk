import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Shift } from '@/types'
import { LiveDuration } from './LiveDuration'
import { formatShiftTime } from '@/features/worktime/utils'

export interface ShiftRowActions {
  onDetails: (shift: Shift) => void
  onClose: (shift: Shift) => void
  onDelete: (shift: Shift) => void
}

export function createShiftColumns(actions: ShiftRowActions): ColumnDef<Shift>[] {
  return [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <button
          type="button"
          className="font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Дата
        </button>
      ),
      cell: ({ row }) => row.original.date,
    },
    {
      accessorKey: 'employeeName',
      header: ({ column }) => (
        <button
          type="button"
          className="font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Сотрудник
        </button>
      ),
      cell: ({ row }) => row.original.employeeName,
    },
    {
      accessorKey: 'location',
      header: 'Объект',
      cell: ({ row }) => row.original.location,
    },
    {
      accessorKey: 'workType',
      header: 'Тип работ',
      cell: ({ row }) => row.original.workType,
    },
    {
      accessorKey: 'equipment',
      header: 'Техника',
      cell: ({ row }) => row.original.equipment,
    },
    {
      accessorKey: 'startTime',
      header: 'Начало',
      cell: ({ row }) => formatShiftTime(row.original.startTime),
    },
    {
      accessorKey: 'endTime',
      header: 'Конец',
      cell: ({ row }) => formatShiftTime(row.original.endTime),
    },
    {
      id: 'duration',
      header: 'Длительность',
      cell: ({ row }) => <LiveDuration shift={row.original} />,
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.status === 'open'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-border bg-muted text-muted-foreground'
          }
        >
          {row.original.status === 'open' ? 'Открыта' : 'Закрыта'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => {
        const shift = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Действия">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onDetails(shift)}>
                Детали
              </DropdownMenuItem>
              {shift.status === 'open' ? (
                <DropdownMenuItem onClick={() => actions.onClose(shift)}>
                  Закрыть
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(shift)}>
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
