import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { Control, FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form'
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
import { OrgFormSection } from '@/features/superadmin/components/OrgFormSection'
import type { OrgFormValues } from '@/features/superadmin/schemas'

const PLAN_ITEMS = [
  { value: 'trial', label: 'Trial' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
]

type OrgStatusLimitsBlockProps = {
  register: UseFormRegister<OrgFormValues>
  control: Control<OrgFormValues>
  errors: FieldErrors<OrgFormValues>
  watch: UseFormWatch<OrgFormValues>
  showActiveToggle: boolean
}

export function OrgStatusLimitsBlock({
  register,
  control,
  errors,
  watch,
  showActiveToggle,
}: OrgStatusLimitsBlockProps) {
  const plan = watch('plan')
  const showTrialDate = plan === 'trial'

  return (
    <OrgFormSection
      title="Статус и лимиты"
      description="Тариф и квоты этой организации. Не влияют на связанные КФХ автоматически."
    >
      <div className="space-y-2">
        <Label>План</Label>
        <Controller
          name="plan"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} items={PLAN_ITEMS}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-max">Макс. сотрудников</Label>
        <Input
          id="org-max"
          type="number"
          min={1}
          {...register('maxEmployees', { valueAsNumber: true })}
        />
        {errors.maxEmployees ? (
          <p className="text-xs text-destructive">{errors.maxEmployees.message}</p>
        ) : null}
      </div>

      {showTrialDate ? (
        <div className="space-y-2">
          <Label>Trial до</Label>
          <Controller
            name="trialEndsAt"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger className="inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input px-3 text-sm">
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  {field.value
                    ? format(parseISO(field.value), 'dd MMMM yyyy', { locale: ru })
                    : 'Не указано'}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={ru}
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) =>
                      field.onChange(date ? format(date, 'yyyy-MM-dd') : null)
                    }
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          <p className="text-xs text-muted-foreground">Актуально только для плана Trial.</p>
        </div>
      ) : null}

      {showActiveToggle ? (
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              />
              <span>
                <span className="font-medium">Организация активна</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Выключение блокирует вход сотрудников. Дублирует действие в таблице.
                </span>
              </span>
            </label>
          )}
        />
      ) : null}
    </OrgFormSection>
  )
}
