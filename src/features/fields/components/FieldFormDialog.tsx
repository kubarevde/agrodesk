import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { fieldFormSchema, type FieldFormValues } from '../schemas'
import { CROP_OPTIONS, SOIL_OPTIONS, type FieldResponse } from '../types'

type FieldFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: FieldResponse | null
  onSubmit: (values: FieldFormValues) => Promise<void>
  isPending: boolean
}

const defaults: FieldFormValues = {
  name: '',
  crop_type: undefined,
  area_ha: undefined,
  soil_type: undefined,
  description: '',
  latitude: undefined,
  longitude: undefined,
}

export function FieldFormDialog({
  open,
  onOpenChange,
  field,
  onSubmit,
  isPending,
}: FieldFormDialogProps) {
  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      field
        ? {
            name: field.name,
            crop_type: (field.crop_type as FieldFormValues['crop_type']) ?? undefined,
            area_ha: field.area_ha ?? undefined,
            soil_type: (field.soil_type as FieldFormValues['soil_type']) ?? undefined,
            description: field.description ?? '',
            latitude: field.latitude ?? undefined,
            longitude: field.longitude ?? undefined,
          }
        : defaults,
    )
  }, [field, form, open])

  const fillGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error('Геолокация недоступна')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue('latitude', Number(pos.coords.latitude.toFixed(6)))
        form.setValue('longitude', Number(pos.coords.longitude.toFixed(6)))
        toast.success('Координаты подставлены')
      },
      () => toast.error('Не удалось получить координаты'),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{field ? 'Редактировать поле' : 'Добавить поле'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values)
            onOpenChange(false)
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="field-name">Название поля</Label>
            <Input id="field-name" {...form.register('name')} />
          </div>

          <div className="space-y-2">
            <Label>Культура</Label>
            <Controller
              name="crop_type"
              control={form.control}
              render={({ field: f }) => (
                <Select
                  value={f.value ?? undefined}
                  onValueChange={f.onChange}
                  items={CROP_OPTIONS.map((crop) => ({ value: crop, label: crop }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите культуру" />
                  </SelectTrigger>
                  <SelectContent>
                    {CROP_OPTIONS.map((crop) => (
                      <SelectItem key={crop} value={crop}>
                        {crop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-area">Площадь (га)</Label>
            <Input
              id="field-area"
              type="number"
              step="0.01"
              {...form.register('area_ha', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label>Тип почвы</Label>
            <Controller
              name="soil_type"
              control={form.control}
              render={({ field: f }) => (
                <Select
                  value={f.value ?? undefined}
                  onValueChange={f.onChange}
                  items={SOIL_OPTIONS.map((soil) => ({ value: soil, label: soil }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите тип почвы" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOIL_OPTIONS.map((soil) => (
                      <SelectItem key={soil} value={soil}>
                        {soil}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-description">Описание</Label>
            <Textarea id="field-description" rows={3} {...form.register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="field-lat">Широта</Label>
              <Input
                id="field-lat"
                type="number"
                step="any"
                {...form.register('latitude', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-lng">Долгота</Label>
              <Input
                id="field-lng"
                type="number"
                step="any"
                {...form.register('longitude', { valueAsNumber: true })}
              />
            </div>
          </div>

          <Button type="button" variant="outline" onClick={fillGeolocation}>
            <MapPin className="size-4" />
            Мои координаты
          </Button>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {field ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
