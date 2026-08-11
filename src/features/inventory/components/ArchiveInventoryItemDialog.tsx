import { useEffect, useState } from 'react'
import { Archive, Loader2, Trash2 } from 'lucide-react'
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
import {
  useArchiveInventoryItem,
  useHardDeleteInventoryItem,
  useInventoryArchiveEligibility,
} from '@/features/inventory/hooks'
import type { InventoryItem } from '@/types'

type Mode = 'archive' | 'hard'

interface ArchiveInventoryItemDialogProps {
  open: boolean
  item: InventoryItem | null
  onClose: () => void
}

export function ArchiveInventoryItemDialog({
  open,
  item,
  onClose,
}: ArchiveInventoryItemDialogProps) {
  const [reason, setReason] = useState('')
  const [mode, setMode] = useState<Mode>('archive')
  const [confirmHard, setConfirmHard] = useState(false)

  const { data: eligibility, isLoading } = useInventoryArchiveEligibility(
    item?.id,
    open && Boolean(item?.id),
  )
  const archive = useArchiveInventoryItem()
  const hardDelete = useHardDeleteInventoryItem()

  useEffect(() => {
    if (!open) {
      setReason('')
      setMode('archive')
      setConfirmHard(false)
    }
  }, [open])

  useEffect(() => {
    if (eligibility?.canHardDelete) setMode('archive')
    else setMode('archive')
  }, [eligibility?.canHardDelete])

  const reasonOk = reason.trim().length >= 5
  const stockBlocks = eligibility?.stockBlocks ?? item?.currentStock !== 0
  const canHard = eligibility?.canHardDelete === true
  const pending = archive.isPending || hardDelete.isPending

  async function submit() {
    if (!item || !reasonOk || stockBlocks) return
    if (mode === 'hard') {
      if (!canHard) return
      if (!confirmHard) {
        setConfirmHard(true)
        return
      }
      await hardDelete.mutateAsync({ id: item.id, reason: reason.trim() })
    } else {
      await archive.mutateAsync({ id: item.id, reason: reason.trim() })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Удалить / архивировать</DialogTitle>
        </DialogHeader>

        {item ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="text-muted-foreground">
                {' '}
                · остаток {item.currentStock.toLocaleString('ru-RU')} {item.unit}
              </span>
            </p>

            {isLoading ? (
              <p className="text-muted-foreground">Проверка связей…</p>
            ) : null}

            {stockBlocks ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
                Нельзя удалить или архивировать ТМЦ с остатком. Сначала оформите расход,
                списание или корректировку остатка, затем повторите действие.
              </p>
            ) : (
              <>
                {canHard ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={mode === 'archive' ? 'default' : 'outline'}
                      className="min-h-11"
                      onClick={() => {
                        setMode('archive')
                        setConfirmHard(false)
                      }}
                    >
                      <Archive className="size-4" />
                      Архивировать
                    </Button>
                    <Button
                      type="button"
                      variant={mode === 'hard' ? 'destructive' : 'outline'}
                      className="min-h-11"
                      onClick={() => setMode('hard')}
                    >
                      <Trash2 className="size-4" />
                      Удалить навсегда
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Есть история движений или связей — доступно только архивирование. История
                    сохранится.
                  </p>
                )}

                {mode === 'hard' && confirmHard ? (
                  <p className="rounded-md border border-destructive/40 px-3 py-2 text-destructive">
                    Позиция будет удалена без возможности восстановления. Подтвердите ещё раз.
                  </p>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="archive-reason">Причина</Label>
                  <Textarea
                    id="archive-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Не меньше 5 символов"
                    className="min-h-20"
                  />
                </div>
              </>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            className="min-h-11"
            variant={mode === 'hard' ? 'destructive' : 'default'}
            disabled={stockBlocks || !reasonOk || pending || isLoading}
            onClick={() => void submit()}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === 'hard'
              ? confirmHard
                ? 'Подтвердить удаление'
                : 'Удалить безвозвратно'
              : 'Архивировать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
