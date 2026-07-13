import { format } from 'date-fns'
import { AlertTriangle, Check, Loader2, MapPin, Play } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
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
import { db } from '@/lib/db'
import type { Employee, Shift, SyncQueueItem } from '@/types'
import { useCreateShift } from './hooks'
import { openShiftSchema, type OpenShiftFormValues } from './openShiftSchema'
import {
  useEmployees,
  useEquipment,
  useLocations,
  useWorkTypes,
} from './referenceHooks'

interface OpenShiftModalProps {
  open: boolean
  onClose: () => void
}

const defaultValues: OpenShiftFormValues = {
  location: '',
  workType: '',
  equipment: '',
  latitude: null,
  longitude: null,
}

function buildShiftPayload(
  values: OpenShiftFormValues,
  employee: Employee,
  startTime: string,
  date: string,
): Partial<Shift> {
  return {
    date,
    startTime,
    endTime: null,
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    telegramId: employee.telegramId,
    location: values.location,
    workType: values.workType,
    equipment: values.equipment ?? '',
    description: '',
    comment: '',
    status: 'open',
    durationRaw: null,
    durationRounded: null,
    latitude: values.latitude ?? null,
    longitude: values.longitude ?? null,
  }
}

export function OpenShiftModal({ open, onClose }: OpenShiftModalProps) {
  const queryClient = useQueryClient()
  const createShift = useCreateShift()
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const { data: workTypes = [], isLoading: workTypesLoading } = useWorkTypes()
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipment()
  const { data: employees = [] } = useEmployees()
  const [geoError, setGeoError] = useState<string | null>(null)

  const form = useForm<OpenShiftFormValues>({
    resolver: zodResolver(openShiftSchema),
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
  const hasGeo = latitude != null && longitude != null

  const handleClose = () => {
    reset(defaultValues)
    setGeoError(null)
    onClose()
  }

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Не удалось получить геолокацию')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude)
        setValue('longitude', position.coords.longitude)
        setGeoError(null)
      },
      () => setGeoError('Не удалось получить геолокацию'),
    )
  }

  const handleSkipGeo = () => {
    setValue('latitude', null)
    setValue('longitude', null)
    setGeoError(null)
  }

  const onSubmit = async (values: OpenShiftFormValues) => {
    const employee = employees[0]
    if (!employee) {
      toast.error('Список сотрудников недоступен')
      return
    }

    const now = new Date()
    const startTime = format(now, 'HH:mm:ss')
    const date = format(now, 'dd.MM.yyyy')
    const payload = buildShiftPayload(values, employee, startTime, date)

    try {
      if (navigator.onLine) {
        await createShift.mutateAsync(payload)
        toast.success(`Смена открыта в ${startTime.slice(0, 5)}`)
      } else {
        const queueItem: SyncQueueItem = {
          id: crypto.randomUUID(),
          method: 'POST',
          url: '/api/shifts',
          body: payload as Record<string, unknown>,
          createdAt: Date.now(),
          idempotencyKey: crypto.randomUUID(),
        }

        const localShift: Shift = {
          id: crypto.randomUUID(),
          date,
          startTime,
          endTime: null,
          employeeCode: employee.employeeCode,
          employeeName: employee.employeeName,
          telegramId: employee.telegramId,
          location: values.location,
          workType: values.workType,
          equipment: values.equipment ?? '',
          description: '',
          comment: '',
          status: 'open',
          durationRaw: null,
          durationRounded: null,
          latitude: values.latitude ?? null,
          longitude: values.longitude ?? null,
        }

        await db.syncQueue.add(queueItem)
        await db.shifts.add(localShift)
        await queryClient.invalidateQueries({ queryKey: ['shifts'] })
        toast.success('Сохранено офлайн — синхронизируется при подключении')
      }

      handleClose()
    } catch {
      toast.error('Не удалось открыть смену')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Открыть смену</DialogTitle>
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
                        <SelectItem key={item.id} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.location ? (
              <p className="text-xs text-destructive">{errors.location.message}</p>
            ) : null}
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
                        <SelectItem key={item.id} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        <SelectItem key={item.id} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>

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
