import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { humanLabel } from '@/lib/display'
import type { AgroPlan } from '../types'
import { planFieldsLabel } from '../utils'

type AgroPlanDeleteDialogProps = {
  plan: AgroPlan
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function AgroPlanDeleteDialog({
  plan,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: AgroPlanDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Удалить задачу?</DialogTitle>
          <DialogDescription>
            {humanLabel(plan.workTypeName, 'Работа')} на поле{' '}
            {planFieldsLabel(plan, 'без названия')} будет удалена из календаря.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
