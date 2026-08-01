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
      description="Идентификация организации. После создания название и slug не меняются."
    >
      <div className="space-y-2">
        <Label htmlFor="org-name">Название</Label>
        <Input id="org-name" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-slug">Slug</Label>
        <Input id="org-slug" {...register('slug')} />
        {errors.slug ? <p className="text-xs text-destructive">{errors.slug.message}</p> : null}
      </div>
      {showOwnerEmail ? (
        <div className="space-y-2">
          <Label htmlFor="org-email">Email владельца</Label>
          <Input id="org-email" type="email" {...register('ownerEmail')} />
          {errors.ownerEmail ? (
            <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>
          ) : null}
        </div>
      ) : null}
    </OrgFormSection>
  )
}
