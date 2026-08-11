import type { Control, FieldErrors } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { OrgFormSection } from '@/features/superadmin/components/OrgFormSection'
import type { OrgFormValues } from '@/features/superadmin/schemas'

type OrgPlatformFeaturesBlockProps = {
  control: Control<OrgFormValues>
  errors: FieldErrors<OrgFormValues>
}

export function OrgPlatformFeaturesBlock({ control, errors }: OrgPlatformFeaturesBlockProps) {
  return (
    <OrgFormSection
      title="Функции платформы"
      description="Флаги уровня платформы: задаёт только суперадмин. Не наследуются дочерним организациям и не видны администратору организации в её кабинете."
    >
      <Controller
        name="marketplaceEnabled"
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
              <span className="font-medium">Доступ к витрине маркетплейса</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Включает витрину и кабинет продавца для этой организации. Не связано с
                привязкой хозяйств к холдингу (головная → дочерняя) — связи холдинга этот
                флаг не меняют и не наследуют.
              </span>
            </span>
          </label>
        )}
      />
      {errors.marketplaceEnabled ? (
        <p className="text-xs text-destructive">{errors.marketplaceEnabled.message}</p>
      ) : null}

      <div className="space-y-1 rounded-md border border-dashed border-border bg-muted/20 px-3 py-2">
        <p className="text-sm font-medium text-foreground">Настройки организации</p>
        <p className="text-xs text-muted-foreground">
          Часовой пояс, справочники и права доступа настраиваются в кабинете самой
          организации (Настройки), а не в этой панели суперадмина.
        </p>
      </div>
    </OrgFormSection>
  )
}
