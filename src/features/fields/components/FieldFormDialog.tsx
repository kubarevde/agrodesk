import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin } from 'lucide-react'
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
import { useDictionary } from '@/features/dictionaries/hooks'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { fieldFormSchema, type FieldFormValues } from '../schemas'
import type { FieldResponse } from '../types'

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
  const { data: crops = [] } = useDictionary('crop')
  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: defaults,
  })

  // Reset only on open / entity id — never put query arrays or unstable `form` in deps
  useEffect(() => {
    if (!open) return
    form.reset(
      field
        ? {
            name: field.name,
            crop_type: field.crop_type ?? undefined,
            area_ha: field.area_ha ?? undefined,
            description: field.description ?? '',
            latitude: field.latitude ?? undefined,
            longitude: field.longitude ?? undefined,
          }
        : defaults,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field?.id, open])

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

  const cropItems = useMemo(() => {
    const rows = crops.map((crop) => ({ value: crop.name, label: crop.name }))
    if (field?.crop_type && !rows.some((item) => item.value === field.crop_type)) {
      return [{ value: field.crop_type, label: field.crop_type }, ...rows]
    }
    return rows
  }, [crops, field?.crop_type])

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
            <Input
              id="field-name"
              placeholder="Например: 1815 компост"
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Культура</Label>
            <Controller
              name="crop_type"
              control={form.control}
              render={({ field: f }) => (
                <Select
                  value={f.value ?? undefined}
                  onValueChange={(value) => f.onChange(value ?? undefined)}
                  items={cropItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите культуру" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {cropItems.map((crop) => (
                      <SelectItem key={crop.value} value={crop.value}>
                        {crop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Список культур редактируется в Настройки → Культуры
            </p>
            <ManageInSettingsLink tabHint="культуры" />
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
