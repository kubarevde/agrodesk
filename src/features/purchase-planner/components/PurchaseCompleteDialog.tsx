import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { selectOptions } from '@/lib/selectOptions'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useUpdatePurchaseItem } from '../hooks'
import { usePurchaseCapabilities } from '../hooks/usePurchaseCapabilities'
import type { PurchasePlannerItem } from '../types'
import { PurchasePhotoGallery } from './PurchasePhotoGallery'

type PurchaseCompleteDialogProps = {
  item: PurchasePlannerItem | null
  open: boolean
  onClose: () => void
  onCompleted?: () => void
}

export function PurchaseCompleteDialog({
  item,
  open,
  onClose,
  onCompleted,
}: PurchaseCompleteDialogProps) {
  const update = useUpdatePurchaseItem()
  const { canCreateExpense } = usePurchaseCapabilities()
  const { data: categories = [] } = useDictionary('expense_category')
  const [actualCost, setActualCost] = useState('')
  const [createExpense, setCreateExpense] = useState(true)
  const [expenseCategory, setExpenseCategory] = useState('parts')
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (!open || !item) return
    setActualCost(item.actualCost?.toString() ?? item.estimatedCost?.toString() ?? '')
    setCreateExpense(canCreateExpense)
    setExpenseCategory('parts')
    setImages(item.images ?? [])
  }, [open, item, canCreateExpense])

  const categoryOptions = selectOptions(
    categories.map((row) => ({ value: row.code, label: row.name })),
  )

  const handleConfirm = async () => {
    if (!item) return
    await update.mutateAsync({
      id: item.id,
      payload: {
        status: 'purchased',
        actualCost: actualCost === '' ? null : Number(actualCost),
        createExpense: canCreateExpense && createExpense,
        expenseCategory,
        images,
      },
    })
    onCompleted?.()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Отметить купленным</DialogTitle>
          <DialogDescription>
            Укажите фактическую стоимость и при необходимости приложите фото чека.
          </DialogDescription>
        </DialogHeader>

        {item ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{item.title}</p>

            {item.images.length > 0 ? (
              <PurchasePhotoGallery images={item.images} title={item.title} />
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="purchase-actual-cost">Фактическая стоимость, ₽</Label>
              <Input
                id="purchase-actual-cost"
                type="number"
                min={0}
                inputMode="decimal"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
              />
            </div>

            {canCreateExpense ? (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={createExpense}
                    onChange={(e) => setCreateExpense(e.target.checked)}
                  />
                  Создать расход в разделе «Затраты»
                </label>
                {createExpense ? (
                  <LabeledSelect
                    label="Категория расхода"
                    value={expenseCategory}
                    options={categoryOptions}
                    onValueChange={(value) => setExpenseCategory(value || 'parts')}
                  />
                ) : null}
              </>
            ) : null}

            <div className="space-y-1">
              <Label>Фото чека или товара</Label>
              <ImageUploader
                value={images}
                onChange={setImages}
                folder="purchase-planner"
                maxFiles={5}
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={update.isPending}
              onClick={() => void handleConfirm()}
            >
              Подтвердить покупку
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
