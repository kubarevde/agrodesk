import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  pending?: boolean
}

export function ShipmentRequestCancelDialog({
  open,
  onClose,
  onConfirm,
  pending = false,
}: Props) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const trimmed = reason.trim()
  const canSubmit = trimmed.length > 0

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Причина отмены заявки</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="sr-cancel-reason">Почему отменяете?</Label>
          <Textarea
            id="sr-cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: покупатель отказался / ошибка в количестве"
            required
          />
          {!canSubmit ? (
            <p className="text-xs text-muted-foreground">Укажите причину — поле обязательное.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Назад
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit || pending}
            onClick={() => onConfirm(trimmed)}
          >
            Отменить заявку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
