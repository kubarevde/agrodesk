import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Calendar } from '@/components/ui/calendar'
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
import type { AdjustmentFormValues } from '@/features/inventory/schemas'
import { numberInputRegister } from '@/lib/formNumbers'
import { selectOptions } from '@/lib/selectOptions'

const DIRECTION_OPTIONS = selectOptions([
  { value: 'increase', label: 'Увеличить остаток' },
  { value: 'decrease', label: 'Уменьшить остаток' },
])

type AdjustmentFormFieldsProps = {
  control: Control<AdjustmentFormValues>
  register: UseFormRegister<AdjustmentFormValues>
  errors: FieldErrors<AdjustmentFormValues>
  items: InventoryItem[]
  selectedItem: InventoryItem | undefined
  itemOptions: Array<{ value: string; label: string }>
}

export function AdjustmentFormFields({
  control,
  register,
  errors,
  items,
  selectedItem,
  itemOptions,
}: AdjustmentFormFieldsProps) {
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Выравнивает учётный остаток с фактическим (инвентаризация, порча, ошибка учёта).
        Это не обычный приход от поставщика и не обычный расход. Причина обязательна и
        сохранится в истории.
      </p>

      <div className="space-y-2">
        <Label>Позиция</Label>
        <Controller
          control={control}
          name="itemId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} items={itemOptions}>
              <SelectTrigger className="w-full" aria-invalid={Boolean(errors.itemId)}>
                <SelectValue placeholder="Выберите позицию" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · учёт {item.currentStock.toLocaleString('ru-RU')} {item.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {selectedItem ? (
          <p className="text-xs text-muted-foreground">
            Сейчас на учёте:{' '}
            <span className="font-medium text-foreground">
              {selectedItem.currentStock.toLocaleString('ru-RU')} {selectedItem.unit}
            </span>
          </p>
        ) : null}
        {errors.itemId ? (
          <p className="text-xs text-destructive">{errors.itemId.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Что сделать с остатком</Label>
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} items={DIRECTION_OPTIONS}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите действие" />
              </SelectTrigger>
              <SelectContent>
                {DIRECTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-qty">
          Количество{selectedItem ? ` (${selectedItem.unit})` : ''}
        </Label>
        <Input
          id="adj-qty"
          type="number"
          step="any"
          aria-invalid={Boolean(errors.quantity)}
          {...register('quantity', numberInputRegister)}
        />
        {errors.quantity ? (
          <p className="text-xs text-destructive">{errors.quantity.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adj-reason">Причина</Label>
        <Input
          id="adj-reason"
          placeholder="Например: инвентаризация, порча, ошибка в учёте"
          aria-invalid={Boolean(errors.reason)}
          {...register('reason')}
        />
        {errors.reason ? (
          <p className="text-xs text-destructive">{errors.reason.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Дата</Label>
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger className="inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <CalendarIcon className="size-4" />
                {field.value
                  ? format(parseApiDate(field.value), 'd MMMM yyyy', { locale: ru })
                  : 'Дата'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? parseApiDate(field.value) : undefined}
                  onSelect={(day) => day && field.onChange(formatApiDate(day))}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          )}
        />
      </div>
    </>
  )
}
