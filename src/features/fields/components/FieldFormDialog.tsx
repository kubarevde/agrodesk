import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
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
import {
  formatCoord,
  isValidLatLng,
  parseCoord,
} from '../geometry'
import { fieldFormSchema, type FieldFormValues } from '../schemas'
import type { FieldResponse } from '../types'
import { FieldContourEditor } from './FieldContourEditor'

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
  crop_code: undefined,
  area_ha: undefined,
  description: '',
  latitude: undefined,
  longitude: undefined,
  polygon: null,
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
    mode: 'onBlur',
  })

  /** Text mirrors for coords — never feed NaN into react-hook-form / Leaflet mid-typing. */
  const [latText, setLatText] = useState('')
  const [lngText, setLngText] = useState('')
  const [areaText, setAreaText] = useState('')
  const [mapEpoch, setMapEpoch] = useState(0)
  const [extrasOpen, setExtrasOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const next = field
      ? {
          name: field.name,
          crop_type: field.crop_type ?? undefined,
          crop_code: field.crop_code ?? undefined,
          area_ha: field.area_ha ?? undefined,
          description: field.description ?? '',
          latitude: field.latitude ?? undefined,
          longitude: field.longitude ?? undefined,
          polygon: (field.polygon ?? null) as FieldFormValues['polygon'],
        }
      : defaults
    form.reset(next)
    setLatText(formatCoord(next.latitude))
    setLngText(formatCoord(next.longitude))
    setAreaText(formatCoord(next.area_ha))
    setExtrasOpen(false)
    setMapEpoch((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field?.id, open])

  const latError = form.formState.errors.latitude
  const lngError = form.formState.errors.longitude
  useEffect(() => {
    if (latError || lngError) setExtrasOpen(true)
  }, [latError, lngError])

  const fillGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error('Геолокация недоступна')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        setLatText(String(lat))
        setLngText(String(lng))
        form.setValue('latitude', lat, { shouldDirty: true, shouldValidate: true })
        form.setValue('longitude', lng, { shouldDirty: true, shouldValidate: true })
        toast.success('Погодная точка подставлена')
      },
      () => toast.error('Не удалось получить координаты'),
    )
  }

  const cropItems = useMemo(() => {
    const rows = crops.map((crop) => ({ value: crop.code, label: crop.name }))
    const orphanCode = field?.crop_code
    const orphanName = field?.crop_type
    if (orphanCode && !rows.some((item) => item.value === orphanCode)) {
      return [
        { value: orphanCode, label: orphanName ?? orphanCode },
        ...rows,
      ]
    }
    if (!orphanCode && orphanName && !rows.some((item) => item.label === orphanName)) {
      return [{ value: orphanName, label: orphanName }, ...rows]
    }
    return rows
  }, [crops, field?.crop_code, field?.crop_type])

  const watchPolygon = form.watch('polygon')
  const parsedLat = parseCoord(latText)
  const parsedLng = parseCoord(lngText)
  const mapWeatherLat = isValidLatLng(parsedLat, parsedLng) ? parsedLat : undefined
  const mapWeatherLng = isValidLatLng(parsedLat, parsedLng) ? parsedLng : undefined

  const syncCoordField = (axis: 'latitude' | 'longitude', text: string) => {
    if (axis === 'latitude') setLatText(text)
    else setLngText(text)
    const value = parseCoord(text)
    form.setValue(axis, value, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{field ? 'Редактировать поле' : 'Добавить поле'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(async (values: FieldFormValues) => {
            await onSubmit({
              ...values,
              latitude: parseCoord(latText),
              longitude: parseCoord(lngText),
              area_ha: parseCoord(areaText),
            })
            onOpenChange(false)
          })}
        >
          <section className="space-y-3" aria-labelledby="field-form-main">
            <h3 id="field-form-main" className="text-sm font-medium text-foreground">
              Основное
            </h3>
            <div className="space-y-2">
              <Label htmlFor="field-name">Название поля</Label>
              <Input
                id="field-name"
                className="min-h-11 sm:min-h-10"
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
                name="crop_code"
                control={form.control}
                render={({ field: f }) => (
                  <Select
                    value={f.value ?? form.getValues('crop_type') ?? undefined}
                    onValueChange={(value) => {
                      const code = value ?? undefined
                      const row = crops.find((crop) => crop.code === code)
                      f.onChange(code)
                      form.setValue('crop_type', row?.name ?? code, {
                        shouldDirty: true,
                      })
                    }}
                    items={cropItems}
                  >
                    <SelectTrigger className="min-h-11 w-full sm:min-h-10">
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
              <ManageInSettingsLink tab="crops" tabHint="культуры" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-area">Площадь (га)</Label>
              <Input
                id="field-area"
                className="min-h-11 sm:min-h-10"
                inputMode="decimal"
                placeholder="Например: 12,5"
                value={areaText}
                onChange={(e) => {
                  setAreaText(e.target.value)
                  form.setValue('area_ha', parseCoord(e.target.value), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
              />
              {form.formState.errors.area_ha ? (
                <p className="text-xs text-destructive">{form.formState.errors.area_ha.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Вручную или из контура на карте.
                </p>
              )}
            </div>
          </section>

          {open ? (
            <FieldContourEditor
              key={mapEpoch}
              polygon={watchPolygon}
              weatherLat={mapWeatherLat}
              weatherLng={mapWeatherLng}
              onChange={({ polygon, syncWeatherPoint, latitude, longitude, areaHa }) => {
                form.setValue('polygon', polygon, { shouldDirty: true })
                if (syncWeatherPoint) {
                  if (latitude != null && longitude != null) {
                    setLatText(String(latitude))
                    setLngText(String(longitude))
                    form.setValue('latitude', latitude, { shouldDirty: true })
                    form.setValue('longitude', longitude, { shouldDirty: true })
                  }
                }
                if (areaHa != null) {
                  setAreaText(String(areaHa))
                  form.setValue('area_ha', areaHa, { shouldDirty: true })
                }
              }}
            />
          ) : null}

          <details
            className="rounded-lg border border-border bg-muted/10 open:pb-3"
            open={extrasOpen}
            onToggle={(e) => setExtrasOpen(e.currentTarget.open)}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span>Дополнительно</span>
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${extrasOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </summary>
            <div className="space-y-4 border-t border-border px-3 pt-3">
              <div className="space-y-2">
                <Label htmlFor="field-description">Описание</Label>
                <Textarea
                  id="field-description"
                  rows={2}
                  {...form.register('description')}
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Погодная точка</p>
                  <p className="text-xs text-muted-foreground">
                    Одна точка для прогноза. Обычно берётся из центра контура.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="field-lat">Широта</Label>
                    <Input
                      id="field-lat"
                      className="min-h-11 sm:min-h-10"
                      inputMode="decimal"
                      placeholder="51,5"
                      value={latText}
                      onChange={(e) => syncCoordField('latitude', e.target.value)}
                    />
                    {form.formState.errors.latitude ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.latitude.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="field-lng">Долгота</Label>
                    <Input
                      id="field-lng"
                      className="min-h-11 sm:min-h-10"
                      inputMode="decimal"
                      placeholder="36,5"
                      value={lngText}
                      onChange={(e) => syncCoordField('longitude', e.target.value)}
                    />
                    {form.formState.errors.longitude ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.longitude.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full sm:min-h-10 sm:w-auto"
                  onClick={fillGeolocation}
                >
                  <MapPin className="size-4" />
                  Мои координаты
                </Button>
              </div>
            </div>
          </details>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-10"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-h-11 bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10"
            >
              {field ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
