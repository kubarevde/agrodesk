import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrgBasicsBlock } from '@/features/superadmin/components/OrgBasicsBlock'
import { OrgHierarchySection } from '@/features/superadmin/components/OrgHierarchySection'
import { OrgPlatformFeaturesBlock } from '@/features/superadmin/components/OrgPlatformFeaturesBlock'
import { OrgStatusLimitsBlock } from '@/features/superadmin/components/OrgStatusLimitsBlock'
import { OrgSummaryBlock } from '@/features/superadmin/components/OrgSummaryBlock'
import {
  useCreateOrganization,
  useOrgChildren,
  useOrgParent,
  useUpdateOrganization,
} from '@/features/superadmin/hooks'
import {
  ORG_FORM_DEFAULTS,
  buildOrgUpdatePayload,
  hierarchyRoleLabel,
  orgCreateSchema,
  orgEditSchema,
  type OrgFormValues,
} from '@/features/superadmin/schemas'
import type { Organization, OrganizationCreateResult } from '@/features/superadmin/types'
import { slugify } from '@/features/superadmin/utils'

type OrgModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization?: Organization | null
  onCreated?: (result: OrganizationCreateResult) => void
}

export function OrgModal({ open, onOpenChange, organization, onCreated }: OrgModalProps) {
  const isEdit = Boolean(organization)
  const createOrg = useCreateOrganization()
  const updateOrg = useUpdateOrganization()
  const parentQuery = useOrgParent(organization?.id, isEdit && open)
  const childrenQuery = useOrgChildren(organization?.id, isEdit && open)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(isEdit ? orgEditSchema : orgCreateSchema),
    defaultValues: ORG_FORM_DEFAULTS,
  })

  useEffect(() => {
    if (!open) return
    if (organization) {
      reset({
        name: organization.name,
        slug: organization.slug,
        ownerEmail: organization.ownerEmail ?? '',
        plan: (['trial', 'basic', 'pro'].includes(organization.plan)
          ? organization.plan
          : 'trial') as OrgFormValues['plan'],
        maxEmployees: organization.maxEmployees,
        trialEndsAt: organization.trialEndsAt,
        isActive: organization.isActive,
        marketplaceEnabled: organization.marketplaceEnabled === true,
      })
      return
    }
    reset(ORG_FORM_DEFAULTS)
  }, [open, organization, reset])

  const nameValue = watch('name')
  useEffect(() => {
    if (isEdit || !open) return
    setValue('slug', slugify(nameValue), { shouldValidate: true })
  }, [nameValue, isEdit, open, setValue])

  const hierarchyLabel = hierarchyRoleLabel({
    parentName: parentQuery.data?.headName ?? null,
    childrenCount: childrenQuery.data?.length ?? 0,
  })

  const onSubmit = async (values: OrgFormValues) => {
    try {
      if (isEdit && organization) {
        await updateOrg.mutateAsync({
          id: organization.id,
          payload: buildOrgUpdatePayload(values),
        })
        toast.success('Организация обновлена')
        onOpenChange(false)
        return
      }
      const result = await createOrg.mutateAsync({
        name: values.name,
        slug: values.slug,
        ownerEmail: values.ownerEmail,
        plan: values.plan,
        maxEmployees: values.maxEmployees,
        trialEndsAt: values.plan === 'trial' ? values.trialEndsAt : null,
      })
      onOpenChange(false)
      onCreated?.(result)
    } catch {
      toast.error(isEdit ? 'Не удалось обновить' : 'Не удалось создать организацию')
    }
  }

  const busy = isSubmitting || createOrg.isPending || updateOrg.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать организацию' : 'Новая организация'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {isEdit && organization ? (
            <OrgSummaryBlock organization={organization} hierarchyLabel={hierarchyLabel} />
          ) : (
            <OrgBasicsBlock register={register} errors={errors} showOwnerEmail />
          )}

          <OrgStatusLimitsBlock
            register={register}
            control={control}
            errors={errors}
            watch={watch}
            showActiveToggle={isEdit}
          />

          {isEdit ? <OrgPlatformFeaturesBlock control={control} errors={errors} /> : null}

          {isEdit && organization ? (
            <OrgHierarchySection orgId={organization.id} enabled={open} />
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground">
              {busy ? <Loader2 className="size-4 animate-spin" /> : isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
