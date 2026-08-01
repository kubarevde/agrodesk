import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { validateRejectionReason } from '../marketplaceApi'

export function RejectListingDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const err = validateRejectionReason(reason)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    onConfirm(reason.trim())
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason('')
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Отклонить объявление</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Причина обязательна — продавец увидит её в кабинете и сможет исправить объявление.
        </p>
        <textarea
          className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Например: недостаточно фото и описания"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-testid="reject-reason-input"
        />
        {error ? (
          <p className="text-sm text-destructive" data-testid="reject-reason-error">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={submit}
            data-testid="reject-confirm"
          >
            Отклонить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
