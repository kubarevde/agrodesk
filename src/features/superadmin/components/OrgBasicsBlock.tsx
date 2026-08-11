import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OrgFormSection } from '@/features/superadmin/components/OrgFormSection'
import type { OrgFormValues } from '@/features/superadmin/schemas'

type OrgBasicsBlockProps = {
  register: UseFormRegister<OrgFormValues>
  errors: FieldErrors<OrgFormValues>
  showOwnerEmail: boolean
}

export function OrgBasicsBlock({ register, errors, showOwnerEmail }: OrgBasicsBlockProps) {
  return (
    <OrgFormSection
      title="Основное"
      description="Идентификация организации. После создания название и адрес (латиницей) не меняются."
    >
      <div className="space-y-2">
        <Label htmlFor="org-name">Название</Label>
        <Input id="org-name" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-slug">Адрес организации в системе (латиницей)</Label>
        <Input id="org-slug" {...register('slug')} placeholder="agro-demo" />
        <p className="text-xs text-muted-foreground">
          Показывается в списке организаций на экране входа. Из него формируется код
          администратора: ADM-… (например, ADM-agro-demo). Только латиница, цифры и дефис.
        </p>
        {errors.slug ? <p className="text-xs text-destructive">{errors.slug.message}</p> : null}
      </div>
      {showOwnerEmail ? (
        <div className="space-y-2">
          <Label htmlFor="org-email">Email владельца</Label>
          <Input
            id="org-email"
            type="text"
            inputMode="email"
            autoComplete="email"
            {...register('ownerEmail')}
          />
          <p className="text-xs text-muted-foreground">
            Альтернативный логин администратора организации (вместо кода ADM-…). Не используется
            для восстановления пароля и рассылок — только для входа в приложение.
          </p>
          {errors.ownerEmail ? (
            <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>
          ) : null}
        </div>
      ) : null}
    </OrgFormSection>
  )
}
