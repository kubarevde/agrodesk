import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { addShiftSchema, type AddShiftFormValues } from './addShiftSchema'
import { ShiftDateTimeField } from './components/ShiftDateTimeField'
import { ShiftFieldSelect, ShiftImplementSelect } from './components/ShiftFieldImplementFields'
import { useManualAddShift } from './hooks'
import {
  useEmployees,
  useEquipment,
  useLocations,
  useWorkTypes,
} from './referenceHooks'
import { formatApiDate } from './utils'

interface AddShiftModalProps {
  open: boolean
  onClose: () => void
}

function getDefaultValues(): AddShiftFormValues {
  const today = formatApiDate(new Date())
  return {
    employeeId: '',
    startDate: today,
    startTime: '08:00',
    endDate: today,
    endTime: '17:00',
    location: '',
    workType: '',
    equipment: '',
    fieldId: '',
    implementId: '',
    description: '',
    comment: '',
  }
}

export function AddShiftModal({ open, onClose }: AddShiftModalProps) {
  const createShift = useManualAddShift()
  const { data: employees = [], isLoading: employeesLoading } = useEmployees()
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const { data: workTypes = [], isLoading: workTypesLoading } = useWorkTypes()
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipment()
  const [commentHidden, setCommentHidden] = useState(false)

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddShiftFormValues>({
    resolver: zodResolver(addShiftSchema),
    defaultValues: getDefaultValues(),
  })

  const equipmentId = watch('equipment')

  const employeeOptions = useMemo(
    () =>
      entityOptions(
        employees,
        (item) => item.id,
        (item) =>
          item.employeeCode
            ? `${item.employeeName} (${item.employeeCode})`
            : item.employeeName,
      ),
    [employees],
  )
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

  useEffect(() => {
    if (!open) {
      reset(getDefaultValues())
      setCommentHidden(false)
    }
  }, [open, reset])

  const handleClose = () => {
    reset(getDefaultValues())
    setCommentHidden(false)
    onClose()
  }

  const onSubmit = async (values: AddShiftFormValues) => {
    const employee = employees.find((item) => item.id === values.employeeId)
    if (!employee) {
      toast.error('Сотрудник не найден')
      return
    }

    try {
      await createShift.mutateAsync({
        employeeId: employee.id,
        date: values.startDate,
        startTime: values.startTime,
        endTime: values.endTime,
        endDate: values.endDate,
        locationId: values.location,
        workTypeId: values.workType,
        equipmentId: values.equipment || undefined,
        fieldId: values.fieldId || undefined,
        implementId: values.implementId || undefined,
        description: values.description,
        comment: values.comment ?? '',
      })
      toast.success('Смена добавлена')
      handleClose()
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Не удалось добавить смену'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить смену</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Сотрудник</Label>
            {employeesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
                <Controller
                  name="employeeId"
                  control={control}
                  render={({ field }) => (
                    <LabeledSelect
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? '')}
                      options={employeeOptions}
                      placeholder="Выберите сотрудника"
                      aria-invalid={Boolean(errors.employeeId)}
                    />
                  )}
                />
            )}
            {errors.employeeId ? (
              <p className="text-xs text-destructive">{errors.employeeId.message}</p>
            ) : null}
          </div>

          <Controller
            name="startDate"
            control={control}
            render={({ field: dateField }) => (
              <Controller
                name="startTime"
                control={control}
                render={({ field: timeField }) => (
                  <ShiftDateTimeField
                    label="Начало смены"
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

          <Controller
            name="endDate"
            control={control}
            render={({ field: dateField }) => (
              <Controller
                name="endTime"
                control={control}
                render={({ field: timeField }) => (
                  <ShiftDateTimeField
                    label="Конец смены"
                    date={dateField.value}
                    time={timeField.value}
                    onDateChange={dateField.onChange}
                    onTimeChange={timeField.onChange}
                    dateError={errors.endDate?.message}
                    timeError={errors.endTime?.message}
                  />
                )}
              />
            )}
          />

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
                    aria-invalid={Boolean(errors.location)}
                  />
                )}
              />
            )}
            {errors.location ? (
              <p className="text-xs text-destructive">{errors.location.message}</p>
            ) : null}
          </div>

          <ShiftFieldSelect control={control} />

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
                    aria-invalid={Boolean(errors.workType)}
                  />
                )}
              />
            )}
            {errors.workType ? (
              <p className="text-xs text-destructive">{errors.workType.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>
              Техника <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            {equipmentLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <Controller
                name="equipment"
                control={control}
                render={({ field }) => (
                  <LabeledSelect
                    value={field.value || 'none'}
                    onValueChange={(value) => {
                      const next = !value || value === 'none' ? '' : value
                      field.onChange(next)
                      if (!next) setValue('implementId', '')
                    }}
                    options={equipmentOptions}
                    placeholder="Не выбрано"
                  />
                )}
              />
            )}
          </div>

          <ShiftImplementSelect control={control} equipmentId={equipmentId || undefined} />

          <div className="space-y-2">
            <Label htmlFor="description">Что сделано</Label>
            <Textarea
              id="description"
              placeholder="Опишите выполненные работы..."
              aria-invalid={Boolean(errors.description)}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          {commentHidden ? null : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="comment">Комментарий</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue('comment', '')
                    setCommentHidden(true)
                  }}
                >
                  Без комментария
                </Button>
              </div>
              <Textarea
                id="comment"
                placeholder="Дополнительный комментарий..."
                maxLength={300}
                {...register('comment')}
              />
            </div>
          )}

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={isSubmitting || createShift.isPending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isSubmitting || createShift.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Добавить смену
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
