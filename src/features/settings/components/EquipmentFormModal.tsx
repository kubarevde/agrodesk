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
import type { Equipment } from '@/types'
import { useCreateEquipment, useUpdateEquipment } from '@/features/settings/hooks'
import { equipmentSchema, type EquipmentFormValues } from '@/features/settings/schemas'
import { ActiveToggle } from './StatusControls'

interface EquipmentFormModalProps {
  open: boolean
  equipment?: Equipment | null
  onClose: () => void
}

const defaults: EquipmentFormValues = { name: '', type: '', isActive: true }

export function EquipmentFormModal({ open, equipment, onClose }: EquipmentFormModalProps) {
  const isEdit = Boolean(equipment)
  const createEquipment = useCreateEquipment()
  const updateEquipment = useUpdateEquipment()
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (!open) {
      reset(defaults)
      return
    }
    reset(
      equipment
        ? { name: equipment.name, type: equipment.type ?? '', isActive: equipment.isActive }
        : defaults,
    )
  }, [equipment, open, reset])

  const pending = isSubmitting || createEquipment.isPending || updateEquipment.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать технику' : 'Добавить технику'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            if (equipment) await updateEquipment.mutateAsync({ id: equipment.id, ...values })
            else await createEquipment.mutateAsync(values)
            onClose()
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="equipment-name">Название</Label>
            <Input id="equipment-name" {...register('name')} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipment-type">Тип</Label>
            <Input id="equipment-type" {...register('type')} />
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
