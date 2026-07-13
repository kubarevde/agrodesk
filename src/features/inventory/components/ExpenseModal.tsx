import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Minus } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { InventoryItem } from '@/types'
import { useCreateExpense } from '@/features/inventory/hooks'
import { expenseSchema, type ExpenseFormValues } from '@/features/inventory/schemas'

interface ExpenseModalProps {
  open: boolean
  items: InventoryItem[]
  onClose: () => void
}

const defaultValues: ExpenseFormValues = {
  itemId: '',
  quantity: 0,
  reason: '',
}

export function ExpenseModal({ open, items, onClose }: ExpenseModalProps) {
  const createExpense = useCreateExpense()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) reset(defaultValues)
  }, [open, reset])

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  const onSubmit = async (values: ExpenseFormValues) => {
    await createExpense.mutateAsync(values)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Расход ТМЦ</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Наименование</Label>
            <Controller
              name="itemId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-invalid={Boolean(errors.itemId)}>
                    <SelectValue placeholder="Выберите позицию" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.itemId ? (
              <p className="text-xs text-destructive">{errors.itemId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-quantity">Количество</Label>
            <Input
              id="expense-quantity"
              type="number"
              min={0}
              step="any"
              aria-invalid={Boolean(errors.quantity)}
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity ? (
              <p className="text-xs text-destructive">{errors.quantity.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Причина списания</Label>
            <Textarea
              id="reason"
              placeholder="Опишите причину расхода..."
              aria-invalid={Boolean(errors.reason)}
              {...register('reason')}
            />
            {errors.reason ? (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            ) : null}
          </div>

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || createExpense.isPending}
              className="w-full"
            >
              {isSubmitting || createExpense.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Minus className="size-4" />
              )}
              Оформить расход
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
