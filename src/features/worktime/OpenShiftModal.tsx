import { AlertTriangle, Check, Loader2, MapPin, Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { useCurrentUser } from '@/features/auth/hooks'
import { entityOptions } from '@/lib/selectOptions'
import { useCreateShift } from './hooks'
import {
  openShiftForEmployeeSchema,
  openShiftSchema,
  type OpenShiftFormValues,
} from './openShiftSchema'
import {
  useEmployees,
  useEquipment,
  useLocations,
  useWorkTypes,
} from './referenceHooks'
import { ShiftFieldSelect, ShiftImplementSelect } from './components/ShiftFieldImplementFields'
import { formatShiftTime } from './utils'

interface OpenShiftModalProps {
  open: boolean
  onClose: () => void
  /** When true, manager/admin picks an employee instead of using the token user. */
  selectEmployee?: boolean
}

const defaultValues: OpenShiftFormValues = {
  location: '',
  workType: '',
  equipment: '',
  fieldId: '',
  implementId: '',
  latitude: null,
  longitude: null,
  employeeId: '',
}

export function OpenShiftModal({
  open,
  onClose,
  selectEmployee,
}: OpenShiftModalProps) {
  const createShift = useCreateShift()
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const { data: workTypes = [], isLoading: workTypesLoading } = useWorkTypes()
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipment()
  const { data: employees = [], isLoading: employeesLoading } = useEmployees()
  const { data: user } = useCurrentUser()
  const canSelectEmployee =
    selectEmployee ?? (user?.role === 'admin' || user?.role === 'manager')
  const [geoError, setGeoError] = useState<string | null>(null)

  const form = useForm<OpenShiftFormValues>({
    resolver: zodResolver(canSelectEmployee ? openShiftForEmployeeSchema : openShiftSchema),
    defaultValues,
  })

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const latitude = watch('latitude')
  const longitude = watch('longitude')
  const equipmentId = watch('equipment')
  const hasGeo = latitude != null && longitude != null

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

  const handleClose = () => {
    reset(defaultValues)
    setGeoError(null)
    onClose()
  }

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      const message = 'Не удалось получить геолокацию'
      setGeoError(message)
      toast.error(`Ошибка: ${message}`)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude)
        setValue('longitude', position.coords.longitude)
        setGeoError(null)
      },
      () => {
        const message = 'Не удалось получить геолокацию'
        setGeoError(message)
        toast.error(`Ошибка: ${message}`)
      },
    )
  }

  const handleSkipGeo = () => {
    setValue('latitude', null)
    setValue('longitude', null)
    setGeoError(null)
  }

  const onSubmit = async (values: OpenShiftFormValues) => {
    if (!user) {
      toast.error('Ошибка: Пользователь не авторизован')
      return
    }

    try {
      const result = await createShift.mutateAsync({
        locationId: values.location,
        workTypeId: values.workType,
        equipmentId: values.equipment || undefined,
        fieldId: values.fieldId || undefined,
        implementId: values.implementId || undefined,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        employeeId: canSelectEmployee ? values.employeeId : undefined,
      })
      if (!result.offline) {
        toast.success(`Смена открыта в ${formatShiftTime(result.shift.startTime)}`)
      }
      handleClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось открыть смену'
      toast.error(`Ошибка: ${message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {canSelectEmployee ? 'Открыть смену за сотрудника' : 'Открыть смену'}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {canSelectEmployee ? (
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
          ) : null}

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
            ) : (
              <ManageInSettingsLink tabHint="места работы" />
            )}
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
            ) : (
              <ManageInSettingsLink tabHint="типы работ" />
            )}
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

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label>Геолокация</Label>
            <Button type="button" variant="outline" className="w-full" onClick={handleGeolocation}>
              <MapPin className="size-4" />
              Отправить геометку
            </Button>
            {hasGeo ? (
              <p className="flex items-center gap-2 text-sm text-success">
                <Check className="size-4" />
                {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
              </p>
            ) : null}
            {geoError ? (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                {geoError}
              </p>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={handleSkipGeo}>
              Пропустить
            </Button>
          </div>

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={isSubmitting || createShift.isPending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isSubmitting || createShift.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Начать смену
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
