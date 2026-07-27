import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Shift } from '@/types'

type DeleteShiftDialogProps = {
  shift: Shift | null
  open: boolean
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** Explicit confirm before hard-deleting a shift (admin, online only). */
export function DeleteShiftDialog({
  shift,
  open,
  pending = false,
  onOpenChange,
  onConfirm,
}: DeleteShiftDialogProps) {
  if (!shift) return null

  const closed = shift.status === 'closed'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Удалить смену?</DialogTitle>
          <DialogDescription>
            {shift.employeeName} · {shift.date} · {shift.workType || 'работа'}.
            {closed
              ? ' Смена уже закрыта: будут удалены связанные факты агрокалендаря, а выполненный план вернётся в статус «Запланировано». Начисления по этой смене исчезнут из учёта.'
              : ' Открытая смена будет удалена без возможности восстановления.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            Удалить смену
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
