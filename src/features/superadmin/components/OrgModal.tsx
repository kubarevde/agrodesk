import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useCreateOrganization, useUpdateOrganization } from '@/features/superadmin/hooks'
import { orgFormSchema, type OrgFormValues } from '@/features/superadmin/schemas'
import type { Organization, OrganizationCreateResult } from '@/features/superadmin/types'
import { slugify } from '@/features/superadmin/utils'

const PLAN_ITEMS = [
  { value: 'trial', label: 'Trial' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
]

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

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      ownerEmail: '',
      plan: 'trial',
      maxEmployees: 10,
      trialEndsAt: null,
    },
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
      })
      return
    }
    reset({
      name: '',
      slug: '',
      ownerEmail: '',
      plan: 'trial',
      maxEmployees: 10,
      trialEndsAt: null,
    })
  }, [open, organization, reset])

  const nameValue = watch('name')
  useEffect(() => {
    if (isEdit || !open) return
    setValue('slug', slugify(nameValue), { shouldValidate: true })
  }, [nameValue, isEdit, open, setValue])

  const onSubmit = async (values: OrgFormValues) => {
    try {
      if (isEdit && organization) {
        await updateOrg.mutateAsync({
          id: organization.id,
          payload: {
            plan: values.plan,
            maxEmployees: values.maxEmployees,
            trialEndsAt: values.trialEndsAt,
          },
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
        trialEndsAt: values.trialEndsAt,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать организацию' : 'Новая организация'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="org-name">Название</Label>
            <Input id="org-name" disabled={isEdit} {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input id="org-slug" disabled={isEdit} {...register('slug')} />
            {errors.slug ? <p className="text-xs text-destructive">{errors.slug.message}</p> : null}
          </div>
          {!isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="org-email">Email владельца</Label>
              <Input id="org-email" type="email" {...register('ownerEmail')} />
              {errors.ownerEmail ? (
                <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>План</Label>
            <Controller
              name="plan"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={PLAN_ITEMS}
                >
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
          </div>
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
