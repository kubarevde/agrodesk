import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { humanLabel } from '@/lib/display'
import type { AgroPlan, AgroPlanCloseOutcome } from '../types'
import { planFieldsLabel } from '../utils'

type AgroPlanAdminCloseDialogProps = {
  plan: AgroPlan
  open: boolean
  pending: boolean
  outcome: AgroPlanCloseOutcome
  note: string
  onOpenChange: (open: boolean) => void
  onOutcomeChange: (outcome: AgroPlanCloseOutcome) => void
  onNoteChange: (note: string) => void
  onConfirm: () => void
}

export function AgroPlanAdminCloseDialog({
  plan,
  open,
  pending,
  outcome,
  note,
  onOpenChange,
  onOutcomeChange,
  onNoteChange,
  onConfirm,
}: AgroPlanAdminCloseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Закрыть задачу</DialogTitle>
          <DialogDescription>
            {humanLabel(plan.workTypeName, 'Работа')} · {planFieldsLabel(plan)}. Закрытие доступно
            администратору без привязки к смене.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant={outcome === 'done' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => onOutcomeChange('done')}
            >
              Выполнено
            </Button>
            <Button
              type="button"
              variant={outcome === 'cancelled' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => onOutcomeChange('cancelled')}
            >
              Отменено
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agro-close-note">Комментарий (необязательно)</Label>
            <Textarea
              id="agro-close-note"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Причина закрытия"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Назад
          </Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>
            Подтвердить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
