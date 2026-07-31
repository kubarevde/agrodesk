import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { useCompleteShipmentRequest } from '../hooks'
import type { ShipmentRequest } from '../types'

type Props = {
  row: ShipmentRequest | null
  open: boolean
  onClose: () => void
}

export function MyShipmentCompleteDialog({ row, open, onClose }: Props) {
  const complete = useCompleteShipmentRequest()
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setImages([])
  }, [open, row?.id])

  const handleConfirm = async () => {
    if (!row) return
    await complete.mutateAsync({
      id: row.id,
      payload: { imageUrls: images },
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Отметить выполненным</DialogTitle>
          <DialogDescription>
            Будет создан расход по ТМЦ. При необходимости приложите фото накладной или чека.
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              <span className="font-medium">{row.inventoryItemName ?? 'ТМЦ'}</span>
              {' · '}
              {row.quantity.toLocaleString('ru-RU')} {row.inventoryItemUnit}
              {' · '}
              {row.customerName}
            </p>
            <ImageUploader
              folder="shipment-requests"
              value={images}
              onChange={setImages}
              maxFiles={3}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!row || complete.isPending}
            onClick={() => void handleConfirm()}
          >
            Выполнено
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
