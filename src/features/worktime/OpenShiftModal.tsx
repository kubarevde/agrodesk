import { AlertTriangle, Check, Loader2, MapPin, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { useAgroPlansToday } from '@/features/agro-calendar/hooks'
import { planFieldsLabel } from '@/features/agro-calendar/utils'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { findFieldWorkLocation, isFieldRequiredForLocation } from '@/features/settings/fieldWorkLocation'
import { apiErrorMessage } from '@/lib/apiError'
import { requestBrowserGeolocation } from '@/lib/geolocation'
import { hasAction } from '@/lib/permissionActions'
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
  selectEmployee?: boolean
}

const defaultValues: OpenShiftFormValues = {
  location: '',
  workType: '',
  equipment: '',
  fieldId: '',
  implementId: '',
  agroPlanId: '',
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
  const { data: perms } = useUserPermissions()
  const canSelectEmployee =
    selectEmployee ??
    hasAction(perms?.actions, 'shift.open_for_others', user?.role)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoPending, setGeoPending] = useState(false)
  const offlineMissingRefs =
    typeof navigator !== 'undefined' &&
    !navigator.onLine &&
    !locationsLoading &&
    !workTypesLoading &&
    locations.length === 0 &&
    workTypes.length === 0

  const form = useForm<OpenShiftFormValues>({
    resolver: zodResolver(canSelectEmployee ? openShiftForEmployeeSchema : openShiftSchema),
    defaultValues,
  })

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const latitude = watch('latitude')
  const longitude = watch('longitude')
  const equipmentId = watch('equipment')
  const workTypeId = watch('workType')
  const locationId = watch('location')
  const fieldId = watch('fieldId')
  const agroPlanId = watch('agroPlanId')
  const employeeId = watch('employeeId')
  const hasGeo = latitude != null && longitude != null

  const selectedWorkType = workTypes.find((item) => item.id === workTypeId)
  const isFieldWork = Boolean(selectedWorkType?.isFieldWork)
  const fieldWorkLocation = useMemo(() => findFieldWorkLocation(locations), [locations])
  const requiresField = isFieldRequiredForLocation(locationId, fieldWorkLocation?.id)
  const planEmployeeId = canSelectEmployee ? employeeId || undefined : user?.id
  const { data: todayPlans = [] } = useAgroPlansToday(planEmployeeId)

  const availablePlans = useMemo(() => {
    return todayPlans.filter((plan) => {
      if (plan.status !== 'planned' && plan.status !== 'in_progress') return false
      if (fieldId && !plan.fieldIds.includes(fieldId) && plan.fieldId !== fieldId) return false
      return true
    })
  }, [todayPlans, fieldId])

  useEffect(() => {
    if (!isFieldWork && agroPlanId) setValue('agroPlanId', '')
  }, [isFieldWork, agroPlanId, setValue])

  useEffect(() => {
    if (!isFieldWork) return
    if (fieldWorkLocation?.id) {
      setValue('location', fieldWorkLocation.id, { shouldValidate: true })
    }
  }, [isFieldWork, fieldWorkLocation?.id, setValue])

  useEffect(() => {
    if (requiresField) return
    if (fieldId) setValue('fieldId', '')
  }, [requiresField, fieldId, setValue])

  useEffect(() => {
    if (!agroPlanId) return
    const plan = availablePlans.find((item) => item.id === agroPlanId)
    if (!plan) return
    setValue('workType', plan.workTypeId)
    setValue('fieldId', plan.fieldId)
    if (plan.equipmentId) setValue('equipment', plan.equipmentId)
    if (plan.implementId) setValue('implementId', plan.implementId)
  }, [agroPlanId, availablePlans, setValue])

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
  const planOptions = useMemo(
    () => [
      { value: 'none', label: 'Без плана' },
      ...availablePlans.map((plan) => ({
        value: plan.id,
        label: `${plan.workTypeName} · ${planFieldsLabel(plan)}`,
      })),
    ],
    [availablePlans],
  )

  const handleClose = () => {
    reset(defaultValues)
    setGeoError(null)
    setGeoPending(false)
    onClose()
  }

  const handleGeolocation = async () => {
    setGeoPending(true)
    setGeoError(null)
    const result = await requestBrowserGeolocation()
    setGeoPending(false)
    if (!result.ok) {
      setGeoError(result.message)
      toast.error(result.message)
      return
    }
    setValue('latitude', result.coords.latitude, { shouldDirty: true })
    setValue('longitude', result.coords.longitude, { shouldDirty: true })
    setGeoError(null)
    toast.success('Геолокация получена')
  }

  const onSubmit = async (values: OpenShiftFormValues) => {
    if (!user) {
      toast.error('Ошибка: Пользователь не авторизован')
      return
    }
    const workType = workTypes.find((item) => item.id === values.workType)
    const locationIdResolved =
      workType?.isFieldWork && fieldWorkLocation?.id
        ? fieldWorkLocation.id
        : values.location
    const needField = isFieldRequiredForLocation(locationIdResolved, fieldWorkLocation?.id)
    if (needField && !values.fieldId) {
      setError('fieldId', { type: 'manual', message: 'Выберите поле' })
      toast.error('Для «Полевая работа» укажите поле')
      return
    }

    try {
      const result = await createShift.mutateAsync({
        locationId: locationIdResolved,
        workTypeId: values.workType,
        equipmentId: values.equipment || undefined,
        fieldId: needField ? values.fieldId || undefined : undefined,
        implementId: values.implementId || undefined,
        agroPlanId: values.agroPlanId || undefined,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        employeeId: canSelectEmployee ? values.employeeId : undefined,
      })
      if (!result.offline) {
        toast.success(`Смена открыта в ${formatShiftTime(result.shift.startTime)}`)
      }
      handleClose()
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Не удалось открыть смену'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {canSelectEmployee ? 'Открыть смену за сотрудника' : 'Открыть смену'}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {offlineMissingRefs ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Нет сохранённых справочников (объекты / типы работ) для офлайн-режима.
              Откройте «Моя смена» один раз с интернетом — списки сохранятся на устройство —
              затем снова попробуйте без сети.
            </div>
          ) : typeof navigator !== 'undefined' && !navigator.onLine ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Нет сети — смена сохранится на устройстве и отправится при появлении связи
              (жёлтый счётчик в шапке).
            </div>
          ) : null}
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

          {isFieldWork && availablePlans.length > 0 ? (
            <div className="space-y-2">
              <Label>План на сегодня</Label>
              <Controller
                name="agroPlanId"
                control={control}
                render={({ field }) => (
                  <LabeledSelect
                    value={field.value || 'none'}
                    onValueChange={(value) =>
                      field.onChange(!value || value === 'none' ? '' : value)
                    }
                    options={planOptions}
                    placeholder="Без плана"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Выбор плана подставит поле, тип работ и технику.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Объект</Label>
            {isFieldWork ? (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                {fieldWorkLocation?.name ?? 'Полевая работа'}
                <span className="mt-1 block text-xs text-muted-foreground">
                  Подставляется автоматически для полевых типов работ (агрокалендарь). Укажите
                  конкретное поле ниже.
                </span>
              </p>
            ) : locationsLoading ? (
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
            {!isFieldWork && errors.location ? (
              <p className="text-xs text-destructive">{errors.location.message}</p>
            ) : !isFieldWork ? (
              <ManageInSettingsLink tab="locations" tabHint="места работы" />
            ) : null}
          </div>

          {requiresField ? (
            <div className="space-y-2">
              <ShiftFieldSelect control={control} required />
              {errors.fieldId ? (
                <p className="text-xs text-destructive">{errors.fieldId.message}</p>
              ) : null}
            </div>
          ) : null}

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
              <ManageInSettingsLink tab="work-types" tabHint="типы работ" />
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
            <p className="text-xs text-muted-foreground">
              Необязательно — можно сразу нажать «Начать смену» без геометки.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={geoPending}
              onClick={() => void handleGeolocation()}
            >
              {geoPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MapPin className="size-4" />
              )}
              {geoPending ? 'Определение…' : 'Отправить геолокацию'}
            </Button>
            {hasGeo ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm text-success">
                  <Check className="size-4" />
                  {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground"
                  onClick={() => {
                    setValue('latitude', null)
                    setValue('longitude', null)
                    setGeoError(null)
                  }}
                >
                  Сбросить
                </Button>
              </div>
            ) : null}
            {geoError ? (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                {geoError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                createShift.isPending ||
                offlineMissingRefs ||
                locations.length === 0 ||
                workTypes.length === 0
              }
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
