import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RegionSelect } from '@/components/shared/RegionSelect'
import { OrgFormSection } from '@/features/superadmin/components/OrgFormSection'
import { OrgSubscriptionEndsField } from '@/features/superadmin/components/OrgSubscriptionEndsField'
import { ORG_PLAN_OPTIONS, ORG_PLANS, isOrgPlanCode } from '@/features/superadmin/plans'
import type { OrgFormValues } from '@/features/superadmin/schemas'
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form'
import { Controller } from 'react-hook-form'

type OrgStatusLimitsBlockProps = {
  register: UseFormRegister<OrgFormValues>
  control: Control<OrgFormValues>
  errors: FieldErrors<OrgFormValues>
  watch: UseFormWatch<OrgFormValues>
  setValue: UseFormSetValue<OrgFormValues>
  showActiveToggle: boolean
  /** When true, changing plan updates maxEmployees to the plan default. */
  applyPlanEmployeeDefaults: boolean
}

export function OrgStatusLimitsBlock({
  register,
  control,
  errors,
  watch,
  setValue,
  showActiveToggle,
  applyPlanEmployeeDefaults,
}: OrgStatusLimitsBlockProps) {
  const plan = watch('plan')
  const planMeta = isOrgPlanCode(plan) ? ORG_PLANS[plan] : null

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
            <Select
              value={field.value}
              onValueChange={(value) => {
                const next = value ?? field.value
                field.onChange(next)
                if (applyPlanEmployeeDefaults && isOrgPlanCode(next)) {
                  setValue('maxEmployees', ORG_PLANS[next].defaultMaxEmployees, {
                    shouldDirty: true,
                  })
                }
              }}
              items={ORG_PLAN_OPTIONS}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_PLAN_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {planMeta ? (
          <p className="text-xs text-muted-foreground">{planMeta.summary}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <RegionSelect
          label="Регион"
          value={watch('region')}
          onValueChange={(code) =>
            setValue('region', code, { shouldDirty: true, shouldValidate: true })
          }
          emptyLabel="Не указан"
        />
        <p className="text-xs text-muted-foreground">
          Необязательно. Общесистемный справочник регионов РФ — не из настроек организации.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-max">Макс. сотрудников</Label>
        <Input
          id="org-max"
          type="number"
          min={1}
          {...register('maxEmployees', { valueAsNumber: true })}
        />
        <p className="text-xs text-muted-foreground">
          При создании нового сотрудника система не даст превысить этот лимит.
          {planMeta
            ? ` Рекомендуемое значение для «${planMeta.label}»: ${planMeta.defaultMaxEmployees}.`
            : null}
        </p>
        {errors.maxEmployees ? (
          <p className="text-xs text-destructive">{errors.maxEmployees.message}</p>
        ) : null}
      </div>

      <OrgSubscriptionEndsField control={control} plan={plan} />

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
