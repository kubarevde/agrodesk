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
      title="Platform features"
      description="Только platform-level флаги. Не наследуются head → child и недоступны org-admin."
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
              <span className="font-medium">marketplace_enabled</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Включает витрину и seller-cabinet для этой организации. Отдельный toggle —
                не связан с attach/detach КФХ.
              </span>
            </span>
          </label>
        )}
      />
      {errors.marketplaceEnabled ? (
        <p className="text-xs text-destructive">{errors.marketplaceEnabled.message}</p>
      ) : null}

      <div className="space-y-1 opacity-60">
        <p className="text-sm text-muted-foreground">Tenant settings</p>
        <p className="text-xs text-muted-foreground">
          Часовой пояс, словари, доступы — только в кабинете организации, не здесь.
        </p>
      </div>
    </OrgFormSection>
  )
}
