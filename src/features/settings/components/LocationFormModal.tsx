import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { AutocompleteInput } from '@/components/shared/AutocompleteInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Location } from '@/types'
import { EquipmentLocationPicker } from '@/features/equipment/components/EquipmentLocationPicker'
import { useCreateLocation, useUpdateLocation } from '@/features/settings/hooks'
import { locationSchema, type LocationFormValues } from '@/features/settings/schemas'
import { ActiveToggle } from './StatusControls'

interface LocationFormModalProps {
  open: boolean
  location?: Location | null
  nameSuggestions?: string[]
  onClose: () => void
}

const defaults: LocationFormValues = {
  name: '',
  description: '',
  isActive: true,
  latitude: undefined,
  longitude: undefined,
}

export function LocationFormModal({
  open,
  location,
  nameSuggestions = [],
  onClose,
}: LocationFormModalProps) {
  const isEdit = Boolean(location)
  const isSystem = Boolean(location?.isSystem)
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: defaults,
  })
  const nameValue = watch('name')
  const latitude = watch('latitude')
  const longitude = watch('longitude')

  useEffect(() => {
    if (!open) {
      reset(defaults)
      return
    }
    reset(
      location
        ? {
            name: location.name,
            description: location.description ?? '',
            isActive: location.isActive,
            latitude: location.latitude ?? undefined,
            longitude: location.longitude ?? undefined,
          }
        : defaults,
    )
  }, [location?.id, open, reset])

  const pending = isSubmitting || createLocation.isPending || updateLocation.isPending

  const onSubmit = async (values: LocationFormValues) => {
    if (location) {
      await updateLocation.mutateAsync({
        id: location.id,
        ...values,
        name: isSystem ? location.name : values.name,
        isActive: isSystem ? true : values.isActive,
      })
    } else {
      await createLocation.mutateAsync(values)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать объект' : 'Добавить объект'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="location-name">Название</Label>
            {isSystem ? (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                {location?.name}
                <span className="ml-2 text-xs text-muted-foreground">(системный)</span>
              </p>
            ) : (
              <AutocompleteInput
                id="location-name"
                value={nameValue}
                onChange={(next) =>
                  setValue('name', next, { shouldDirty: true, shouldValidate: true })
                }
                suggestions={nameSuggestions}
                aria-invalid={Boolean(errors.name)}
              />
            )}
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location-description">Описание</Label>
            <Textarea id="location-description" rows={3} {...register('description')} />
          </div>

          <EquipmentLocationPicker
            latitude={latitude}
            longitude={longitude}
            title="Геопривязка места работы"
            hint="Точка отобразится на карте предприятия. Найдите место или нажмите на карту."
            markerLabel="Место работы"
            onChange={(lat, lng) => {
              setValue('latitude', lat, { shouldDirty: true })
              setValue('longitude', lng, { shouldDirty: true })
            }}
            onClear={() => {
              setValue('latitude', undefined, { shouldDirty: true })
              setValue('longitude', undefined, { shouldDirty: true })
            }}
          />

          {!isSystem ? (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveToggle value={field.value} onChange={field.onChange} />
              )}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Системное место работы нельзя деактивировать или удалить. Можно задать описание и
              точку на карте.
            </p>
          )}
          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isEdit ? 'Сохранить' : 'Добавить объект'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
