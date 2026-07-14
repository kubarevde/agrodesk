import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkType } from '@/types'
import { useCreateWorkType, useUpdateWorkType } from '@/features/settings/hooks'
import { workTypeSchema, type WorkTypeFormValues } from '@/features/settings/schemas'
import { ActiveToggle } from './StatusControls'

interface WorkTypeFormModalProps {
  open: boolean
  workType?: WorkType | null
  onClose: () => void
}

const defaults: WorkTypeFormValues = { name: '', category: '', isActive: true }

export function WorkTypeFormModal({ open, workType, onClose }: WorkTypeFormModalProps) {
  const isEdit = Boolean(workType)
  const createWorkType = useCreateWorkType()
  const updateWorkType = useUpdateWorkType()
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkTypeFormValues>({
    resolver: zodResolver(workTypeSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (!open) {
      reset(defaults)
      return
    }
    reset(
      workType
        ? { name: workType.name, category: workType.category ?? '', isActive: workType.isActive }
        : defaults,
    )
  }, [open, reset, workType])

  const pending = isSubmitting || createWorkType.isPending || updateWorkType.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать тип работ' : 'Добавить тип работ'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            if (workType) await updateWorkType.mutateAsync({ id: workType.id, ...values })
            else await createWorkType.mutateAsync(values)
            onClose()
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="work-type-name">Название</Label>
            <Input id="work-type-name" {...register('name')} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-type-category">Категория</Label>
            <Input id="work-type-category" {...register('category')} />
          </div>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveToggle value={field.value} onChange={field.onChange} />
            )}
          />
          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
