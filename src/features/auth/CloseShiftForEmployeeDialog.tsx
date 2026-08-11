import { Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatShiftTime } from '@/features/worktime/utils'
import type { Shift } from '@/types'

type Props = {
  open: boolean
  shifts: Shift[]
  onClose: () => void
  onSelect: (shift: Shift) => void
}

/**
 * Pick an open shift to close — then parent opens shared CloseShiftModal
 * (same path as «Смены» / ShiftDetailModal).
 */
export function CloseShiftForEmployeeDialog({
  open,
  shifts,
  onClose,
  onSelect,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Закрыть смену за сотрудника</DialogTitle>
          <DialogDescription>
            Выберите открытую смену. Дальше откроется то же окно закрытия, что в разделе
            «Смены».
          </DialogDescription>
        </DialogHeader>
        {shifts.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Сейчас нет открытых смен других сотрудников.
          </p>
        ) : (
          <ul className="space-y-2">
            {shifts.map((shift) => (
              <li key={shift.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-primary/40"
                  onClick={() => {
                    onSelect(shift)
                    onClose()
                  }}
                >
                  <Square className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  <span className="min-w-0 space-y-0.5">
                    <span className="block font-medium text-foreground">
                      {shift.employeeName}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {shift.location}
                      {shift.workType ? ` · ${shift.workType}` : ''}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      с {formatShiftTime(shift.startTime)} · {shift.date}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" className="w-full" onClick={onClose}>
          Отмена
        </Button>
      </DialogContent>
    </Dialog>
  )
}
