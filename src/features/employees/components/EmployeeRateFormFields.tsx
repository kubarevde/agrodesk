import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { DatePicker } from '@/components/shared/DatePicker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Textarea } from '@/components/ui/textarea'
import type { SelectOption } from '@/lib/selectOptions'
import { numberInputRegister } from '@/lib/formNumbers'
import { PIECEWORK_UNITS, type EmployeeRateFormValues } from '@/features/employees/schemas'

interface Props {
  control: Control<EmployeeRateFormValues>
  register: UseFormRegister<EmployeeRateFormValues>
  errors: FieldErrors<EmployeeRateFormValues>
  workTypeOptions: SelectOption[]
  workTypesLoading: boolean
}

const SCHEME_OPTIONS = [
  { value: 'hourly', label: 'Почасовая' },
  { value: 'per_shift', label: 'За смену' },
  { value: 'monthly', label: 'Оклад' },
  { value: 'piecework', label: 'Сдельная' },
]

function rateLabel(scheme: string, unit: string | null) {
  if (scheme === 'hourly') return 'Ставка, ₽/ч'
  if (scheme === 'per_shift') return 'Ставка, ₽/смена'
  if (scheme === 'monthly') return 'Оклад, ₽/мес'
  return `Расценка, ₽/${unit || 'ед.'}`
}

export function EmployeeRateFormFields({
  control,
  register,
  errors,
  workTypeOptions,
  workTypesLoading,
}: Props) {
  return (
    <Controller
      control={control}
      name="paymentScheme"
      render={({ field: schemeField }) => {
        const scheme = schemeField.value
        const showWorkType = scheme === 'hourly' || scheme === 'piecework'
        const showOvertime = scheme === 'hourly'
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Схема оплаты</Label>
              <LabeledSelect
                value={scheme}
                onValueChange={schemeField.onChange}
                options={SCHEME_OPTIONS}
                placeholder="Схема"
              />
            </div>

            {showWorkType && (
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
                {errors.workTypeId && (
                  <p className="text-xs text-destructive">{errors.workTypeId.message}</p>
                )}
              </div>
            )}

            {scheme === 'piecework' && (
              <div className="space-y-2">
                <Label>Единица</Label>
                <Controller
                  control={control}
                  name="pieceworkUnit"
                  render={({ field }) => (
                    <LabeledSelect
                      value={field.value ?? ''}
                      onValueChange={(v) => field.onChange(v || null)}
                      options={PIECEWORK_UNITS.map((u) => ({ value: u, label: u }))}
                      placeholder="Единица"
                    />
                  )}
                />
              </div>
            )}

            <Controller
              control={control}
              name="pieceworkUnit"
              render={({ field: unitField }) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rate">{rateLabel(scheme, unitField.value)}</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      min={0}
                      {...register('rate', numberInputRegister)}
                    />
                  </div>
                  {showOvertime && (
                    <div className="space-y-2">
                      <Label htmlFor="threshold">Порог ч</Label>
                      <Input
                        id="threshold"
                        type="number"
                        step="0.5"
                        min={0}
                        {...register('overtimeThresholdHours', numberInputRegister)}
                      />
                    </div>
                  )}
                </div>
              )}
            />

            {showOvertime && (
              <div className="space-y-2">
                <Label htmlFor="multiplier">Множитель переработки</Label>
                <Input
                  id="multiplier"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register('overtimeMultiplier', numberInputRegister)}
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Действует с</Label>
                <Controller
                  control={control}
                  name="validFrom"
                  render={({ field }) => (
                    <DatePicker
                      id="validFrom"
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? '')}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validTo">До</Label>
                <Controller
                  control={control}
                  name="validTo"
                  render={({ field }) => (
                    <DatePicker
                      id="validTo"
                      value={field.value || undefined}
                      onChange={(v) => field.onChange(v ?? '')}
                    />
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Заметка</Label>
              <Textarea id="notes" rows={2} {...register('notes')} />
            </div>
          </div>
        )
      }}
    />
  )
}
