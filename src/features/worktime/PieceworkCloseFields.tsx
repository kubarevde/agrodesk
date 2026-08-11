import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CloseShiftFormValues, PieceworkUnit } from './closeShiftSchema'
import { PIECEWORK_UNITS } from './closeShiftSchema'
import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form'

interface PieceworkCloseFieldsProps {
  register: UseFormRegister<CloseShiftFormValues>
  setValue: UseFormSetValue<CloseShiftFormValues>
  errors: FieldErrors<CloseShiftFormValues>
  unitValue?: PieceworkUnit
  suggestedUnit?: string | null
}

export function PieceworkCloseFields({
  register,
  setValue,
  errors,
  unitValue,
  suggestedUnit,
}: PieceworkCloseFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <p className="text-sm font-medium text-foreground">Сдельная выработка</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="piecework-quantity">Объём</Label>
          <Input
            id="piecework-quantity"
            type="number"
            step="0.001"
            min="0"
            placeholder="0"
            aria-invalid={Boolean(errors.quantity)}
            {...register('quantity', { valueAsNumber: true })}
          />
          {errors.quantity ? (
            <p className="text-xs text-destructive">{errors.quantity.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="piecework-unit">Единица</Label>
          <Select
            value={unitValue ?? suggestedUnit ?? undefined}
            onValueChange={(value) =>
              setValue('unit', value as PieceworkUnit, { shouldValidate: true })
            }
          >
            <SelectTrigger id="piecework-unit" aria-invalid={Boolean(errors.unit)}>
              <SelectValue placeholder="Выберите" />
            </SelectTrigger>
            <SelectContent>
              {PIECEWORK_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unit ? (
            <p className="text-xs text-destructive">{errors.unit.message}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
