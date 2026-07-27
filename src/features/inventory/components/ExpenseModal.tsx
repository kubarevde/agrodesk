import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2, Minus } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { InventoryItem } from '@/types'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import { useCreateExpense } from '@/features/inventory/hooks'
import { expenseSchema, type ExpenseFormValues } from '@/features/inventory/schemas'
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
    date: formatApiDate(new Date()),
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

  const today = new Date()

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
            <Label>Дата списания</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => {
                const selected = field.value ? parseApiDate(field.value) : undefined
                const label = selected ? format(selected, 'dd.MM.yyyy') : 'Выберите дату'

                return (
                  <Popover>
                    <PopoverTrigger className="inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm font-normal">
                      <CalendarIcon className="size-4 text-muted-foreground" />
                      {label}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        locale={ru}
                        selected={selected}
                        disabled={(date) => date > today}
                        onSelect={(value) => value && field.onChange(formatApiDate(value))}
                        defaultMonth={selected}
                      />
                    </PopoverContent>
                  </Popover>
                )
              }}
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
