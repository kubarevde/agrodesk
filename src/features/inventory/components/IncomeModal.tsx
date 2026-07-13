import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2, Plus } from 'lucide-react'
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
import type { InventoryItem } from '@/types'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import { useCreateIncome } from '@/features/inventory/hooks'
import { incomeSchema, type IncomeFormValues } from '@/features/inventory/schemas'
import { SUPPLIERS } from '@/features/inventory/utils'

interface IncomeModalProps {
  open: boolean
  items: InventoryItem[]
  onClose: () => void
}

function getDefaultValues(): IncomeFormValues {
  return {
    itemId: '',
    quantity: 0,
    supplier: '',
    cost: 0,
    date: formatApiDate(new Date()),
  }
}

export function IncomeModal({ open, items, onClose }: IncomeModalProps) {
  const createIncome = useCreateIncome()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: getDefaultValues(),
  })

  useEffect(() => {
    if (!open) reset(getDefaultValues())
  }, [open, reset])

  const handleClose = () => {
    reset(getDefaultValues())
    onClose()
  }

  const onSubmit = async (values: IncomeFormValues) => {
    await createIncome.mutateAsync(values)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Приход ТМЦ</DialogTitle>
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
            <Label htmlFor="quantity">Количество</Label>
            <Input
              id="quantity"
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
            <Label>Поставщик</Label>
            <Controller
              name="supplier"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-invalid={Boolean(errors.supplier)}>
                    <SelectValue placeholder="Выберите поставщика" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIERS.map((supplier) => (
                      <SelectItem key={supplier} value={supplier}>
                        {supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplier ? (
              <p className="text-xs text-destructive">{errors.supplier.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Стоимость, ₽</Label>
            <Input
              id="cost"
              type="number"
              min={0}
              step="any"
              aria-invalid={Boolean(errors.cost)}
              {...register('cost', { valueAsNumber: true })}
            />
            {errors.cost ? (
              <p className="text-xs text-destructive">{errors.cost.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Дата</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => {
                const selected = field.value ? parseApiDate(field.value) : undefined
                const label = selected ? format(selected, 'dd.MM.yyyy') : 'Выберите дату'

                return (
                  <Popover>
                    <PopoverTrigger
                      className="inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm font-normal"
                    >
                      <CalendarIcon className="size-4 text-muted-foreground" />
                      {label}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        locale={ru}
                        selected={selected}
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

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={isSubmitting || createIncome.isPending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isSubmitting || createIncome.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Оформить приход
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
