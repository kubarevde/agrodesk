import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil } from 'lucide-react'
import { useEffect, useMemo } from 'react'
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
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage } from '@/lib/apiError'
import { entityOptions } from '@/lib/selectOptions'
import type { Shift } from '@/types'
import { ShiftDateTimeField } from './components/ShiftDateTimeField'
import { editShiftSchema, type EditShiftFormValues } from './editShiftSchema'
import { useUpdateShift } from './hooks'
import { useEquipment, useLocations, useWorkTypes } from './referenceHooks'
import { formatShiftTime, inferShiftEndDate } from './utils'

interface EditShiftModalProps {
  shift: Shift
  open: boolean
  onClose: () => void
  onUpdated?: (shift: Shift) => void
}

export function EditShiftModal({ shift, open, onClose, onUpdated }: EditShiftModalProps) {
  const updateShift = useUpdateShift()
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const { data: workTypes = [], isLoading: workTypesLoading } = useWorkTypes()
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipment()

  const locationOptions = useMemo(
    () => entityOptions(locations, (item) => item.id, (item) => item.name),
    [locations],
  )
  const workTypeOptions = useMemo(
    () => entityOptions(workTypes, (item) => item.id, (item) => item.name),
    [workTypes],
  )
  const equipmentOptions = useMemo(
    () =>
      entityOptions(
        equipment,
        (item) => item.id,
        (item) => (item.type ? `${item.name} (${item.type})` : item.name),
        [{ value: 'none', label: 'Не выбрано' }],
      ),
    [equipment],
  )

  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditShiftFormValues>({
    resolver: zodResolver(editShiftSchema),
    defaultValues: {
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      location: '',
      workType: '',
      equipment: '',
      description: '',
      comment: '',
      status: 'open',
    },
  })

  const status = watch('status')

  useEffect(() => {
    if (!open) return
    reset({
      startDate: shift.date,
      startTime: formatShiftTime(shift.startTime),
      endDate: shift.status === 'closed' ? inferShiftEndDate(shift) : '',
      endTime: shift.endTime ? formatShiftTime(shift.endTime) : '',
      location: locations.find((item) => item.name === shift.location)?.id ?? '',
      workType: workTypes.find((item) => item.name === shift.workType)?.id ?? '',
      equipment: equipment.find((item) => item.name === shift.equipment)?.id ?? '',
      description: shift.description,
      comment: shift.comment,
      status: shift.status,
    })
  }, [equipment, locations, open, reset, shift, workTypes])

  const onSubmit = async (values: EditShiftFormValues) => {
    try {
      const updated = await updateShift.mutateAsync({
        id: shift.id,
        date: values.startDate,
        startTime: values.startTime,
        endTime: values.status === 'closed' ? values.endTime || null : null,
        endDate: values.status === 'closed' ? values.endDate || null : null,
        locationId: values.location,
        workTypeId: values.workType,
        equipmentId: values.equipment || null,
        description: values.description,
        comment: values.comment,
      })
      toast.success('Смена обновлена')
      onUpdated?.(updated)
      onClose()
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Не удалось обновить смену'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать смену</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="startDate"
            control={control}
            render={({ field: dateField }) => (
              <Controller
                name="startTime"
                control={control}
                render={({ field: timeField }) => (
                  <ShiftDateTimeField
                    label="Дата и время начала смены"
                    date={dateField.value}
                    time={timeField.value}
                    onDateChange={dateField.onChange}
                    onTimeChange={timeField.onChange}
                    dateError={errors.startDate?.message}
                    timeError={errors.startTime?.message}
                  />
                )}
              />
            )}
          />

          {status === 'closed' ? (
            <Controller
              name="endDate"
              control={control}
              render={({ field: dateField }) => (
                <Controller
                  name="endTime"
                  control={control}
                  render={({ field: timeField }) => (
                    <ShiftDateTimeField
                      label="Дата и время окончания смены"
                      date={dateField.value ?? ''}
                      time={timeField.value ?? ''}
                      onDateChange={dateField.onChange}
                      onTimeChange={timeField.onChange}
                      dateError={errors.endDate?.message}
                      timeError={errors.endTime?.message}
                    />
                  )}
                />
              )}
            />
          ) : (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Смена открыта — окончание не задаётся. Закройте смену отдельно или оставьте
              пустым.
            </p>
          )}

          <div className="space-y-2">
            <Label>Объект</Label>
            {locationsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <LabeledSelect
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    options={locationOptions}
                    placeholder="Выберите объект"
                  />
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
                  <LabeledSelect
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    options={workTypeOptions}
                    placeholder="Выберите тип работ"
                  />
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
                  <LabeledSelect
                    value={field.value || 'none'}
                    onValueChange={(value) =>
                      field.onChange(!value || value === 'none' ? '' : value)
                    }
                    options={equipmentOptions}
                    placeholder="Не выбрано"
                  />
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
