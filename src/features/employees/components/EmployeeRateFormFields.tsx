import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Textarea } from '@/components/ui/textarea'
import type { SelectOption } from '@/lib/selectOptions'
import type { EmployeeRateFormValues } from '@/features/employees/schemas'

interface EmployeeRateFormFieldsProps {
  control: Control<EmployeeRateFormValues>
  register: UseFormRegister<EmployeeRateFormValues>
  errors: FieldErrors<EmployeeRateFormValues>
  workTypeOptions: SelectOption[]
  workTypesLoading: boolean
}

export function EmployeeRateFormFields({
  control,
  register,
  errors,
  workTypeOptions,
  workTypesLoading,
}: EmployeeRateFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>Тип работы</Label>
        <Controller
          control={control}
          name="workTypeId"
          render={({ field }) => (
            <LabeledSelect
              value={field.value ?? '__base__'}
              onValueChange={(value) =>
                field.onChange(value === '__base__' || !value ? null : value)
              }
              options={workTypeOptions}
              placeholder={workTypesLoading ? 'Загрузка…' : 'Выберите тип'}
              disabled={workTypesLoading}
            />
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rate">Ставка, ₽/ч</Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            min={0}
            aria-invalid={Boolean(errors.rate)}
            {...register('rate', { valueAsNumber: true })}
          />
          {errors.rate ? (
            <p className="text-xs text-destructive">{errors.rate.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="threshold">Порог ч</Label>
          <Input
            id="threshold"
            type="number"
            step="0.5"
            min={0}
            {...register('overtimeThresholdHours', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="multiplier">Множитель переработки</Label>
        <Input
          id="multiplier"
          type="number"
          step="0.01"
          min={0}
          {...register('overtimeMultiplier', { valueAsNumber: true })}
        />
        <p className="text-xs text-muted-foreground">1.33 = +33%</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="validFrom">Действует с</Label>
          <Input id="validFrom" type="date" {...register('validFrom')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validTo">До</Label>
          <Input
            id="validTo"
            type="date"
            {...register('validTo', {
              setValueAs: (value: string) => (value ? value : null),
            })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Примечание</Label>
        <Textarea id="notes" rows={2} {...register('notes')} />
      </div>
    </>
  )
}
