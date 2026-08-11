import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Minus } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { DatePicker } from '@/components/shared/DatePicker'
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
import { formatIsoDate } from '@/lib/dates'
import { numberInputRegister } from '@/lib/formNumbers'

interface ExpenseModalProps {
  open: boolean
  items: InventoryItem[]
  onClose: () => void
}

function getDefaultValues(): Partial<ExpenseFormValues> {
  return {
    itemId: '',
    quantity: undefined,
    reason: '',
    date: formatIsoDate(new Date()),
  }
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
    defaultValues: getDefaultValues(),
  })

  useEffect(() => {
    if (!open) reset(getDefaultValues())
  }, [open, reset])

  const handleClose = () => {
    reset(getDefaultValues())
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={items.map((item) => ({ value: item.id, label: item.name }))}
                >
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
              {...register('quantity', numberInputRegister)}
            />
            {errors.quantity ? (
              <p className="text-xs text-destructive">{errors.quantity.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-date">Дата списания</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="expense-date"
                  value={field.value || undefined}
                  onChange={(next) => field.onChange(next ?? '')}
                  disableFuture
                  className="min-h-11 sm:min-h-9"
                />
              )}
            />
            {errors.date ? (
              <p className="text-xs text-destructive">{errors.date.message}</p>
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
