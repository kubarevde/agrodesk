import type { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import type { Shift } from '@/types'

interface ShiftsPaginationProps {
  table: Table<Shift>
}

export function ShiftsPagination({ table }: ShiftsPaginationProps) {
  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()

  return (
    <div className="flex items-center justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        Назад
      </Button>
      <span className="text-sm text-muted-foreground">
        Страница {pageIndex + 1} из {Math.max(pageCount, 1)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        Вперёд
      </Button>
    </div>
  )
}
