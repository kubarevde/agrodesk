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
import { Textarea } from '@/components/ui/textarea'
import type { Location } from '@/types'
import { useCreateLocation, useUpdateLocation } from '@/features/settings/hooks'
import { locationSchema, type LocationFormValues } from '@/features/settings/schemas'
import { ActiveToggle } from './StatusControls'

interface LocationFormModalProps {
  open: boolean
  location?: Location | null
  onClose: () => void
}

const defaults: LocationFormValues = { name: '', description: '', isActive: true }

export function LocationFormModal({ open, location, onClose }: LocationFormModalProps) {
  const isEdit = Boolean(location)
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: defaults,
  })

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
          }
        : defaults,
    )
  }, [location, open, reset])

  const pending = isSubmitting || createLocation.isPending || updateLocation.isPending

  const onSubmit = async (values: LocationFormValues) => {
    if (location) {
      await updateLocation.mutateAsync({ id: location.id, ...values })
    } else {
      await createLocation.mutateAsync(values)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать объект' : 'Добавить объект'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="location-name">Название</Label>
            <Input id="location-name" {...register('name')} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location-description">Описание</Label>
            <Textarea id="location-description" rows={3} {...register('description')} />
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
              {isEdit ? 'Сохранить' : 'Добавить объект'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
