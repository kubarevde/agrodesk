import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { Shift } from '@/types'
import { editShiftSchema, type EditShiftFormValues } from './editShiftSchema'
import { useUpdateShift } from './hooks'
import { useEquipment, useLocations, useWorkTypes } from './referenceHooks'

interface EditShiftModalProps {
  shift: Shift
  open: boolean
  onClose: () => void
}

export function EditShiftModal({ shift, open, onClose }: EditShiftModalProps) {
  const updateShift = useUpdateShift()
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const { data: workTypes = [], isLoading: workTypesLoading } = useWorkTypes()
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipment()

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { isSubmitting },
  } = useForm<EditShiftFormValues>({
    resolver: zodResolver(editShiftSchema),
    defaultValues: { location: '', workType: '', equipment: '', description: '', comment: '' },
  })

  useEffect(() => {
    if (!open) return
    reset({
      location: locations.find((item) => item.name === shift.location)?.id ?? '',
      workType: workTypes.find((item) => item.name === shift.workType)?.id ?? '',
      equipment: equipment.find((item) => item.name === shift.equipment)?.id ?? '',
      description: shift.description,
      comment: shift.comment,
    })
  }, [equipment, locations, open, reset, shift, workTypes])

  const onSubmit = async (values: EditShiftFormValues) => {
    try {
      await updateShift.mutateAsync({
        id: shift.id,
        locationId: values.location,
        workTypeId: values.workType,
        equipmentId: values.equipment || null,
        description: values.description,
        comment: values.comment,
      })
      toast.success('Смена обновлена')
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось обновить смену'
      toast.error(`Ошибка: ${message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать смену</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Объект</Label>
            {locationsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите объект" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Тип работ</Label>
            {workTypesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <Controller
                name="workType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите тип работ" />
                    </SelectTrigger>
                    <SelectContent>
                      {workTypes.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Техника</Label>
            {equipmentLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <Controller
                name="equipment"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Не выбрано" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не выбрано</SelectItem>
                      {equipment.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Описание</Label>
            <Textarea id="edit-description" rows={3} {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-comment">Комментарий</Label>
            <Textarea id="edit-comment" rows={2} {...register('comment')} />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting || updateShift.isPending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isSubmitting || updateShift.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Pencil className="size-4" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
