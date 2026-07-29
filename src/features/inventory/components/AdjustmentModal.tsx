import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { InventoryItem } from '@/types'
import { formatApiDate } from '@/features/worktime/utils'
import { useCreateAdjustment } from '@/features/inventory/hooks'
import { adjustmentSchema, type AdjustmentFormValues } from '@/features/inventory/schemas'
import { selectOptions } from '@/lib/selectOptions'
import { AdjustmentFormFields } from './AdjustmentFormFields'

interface AdjustmentModalProps {
  open: boolean
  items: InventoryItem[]
  onClose: () => void
}

function defaults(): Partial<AdjustmentFormValues> {
  return {
    itemId: '',
    direction: 'increase',
    quantity: undefined,
    reason: '',
    date: formatApiDate(new Date()),
  }
}

export function AdjustmentModal({ open, items, onClose }: AdjustmentModalProps) {
  const createAdjustment = useCreateAdjustment()
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: defaults(),
  })

  const selectedItemId = useWatch({ control, name: 'itemId' })
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId),
    [items, selectedItemId],
  )
  const itemOptions = useMemo(
    () =>
      selectOptions(
        items.map((item) => ({
          value: item.id,
          label: `${item.name} · учёт ${item.currentStock.toLocaleString('ru-RU')} ${item.unit}`,
        })),
      ),
    [items],
  )

  useEffect(() => {
    if (!open) reset(defaults())
  }, [open, reset])

  const close = () => {
    reset(defaults())
    onClose()
  }

  const pending = isSubmitting || createAdjustment.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Корректировка остатка</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            await createAdjustment.mutateAsync(values)
            close()
          })}
        >
          <AdjustmentFormFields
            control={control}
            register={register}
            errors={errors}
            items={items}
            selectedItem={selectedItem}
            itemOptions={itemOptions}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SlidersHorizontal className="size-4" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
