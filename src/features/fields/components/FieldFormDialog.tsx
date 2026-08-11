import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import {
  formatCoord,
  isValidLatLng,
  parseCoord,
  type LatLngPair,
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
  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  })

  const [latText, setLatText] = useState('')
  const [lngText, setLngText] = useState('')
  const [areaText, setAreaText] = useState('')
  const [mapEpoch, setMapEpoch] = useState(0)
  const [extrasOpen, setExtrasOpen] = useState(false)
  const contourFlushRef = useRef<(() => LatLngPair[] | null | void) | null>(null)

  const legacyCropLabel = (field?.crop_type || field?.crop_code || '').trim() || null

  useEffect(() => {
    if (!open) return
    const next = field
      ? {
          name: field.name,
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
          onSubmit={(event) => {
            event.preventDefault()
            contourFlushRef.current?.()
            void form.handleSubmit(async (values: FieldFormValues) => {
              await onSubmit({
                ...values,
                latitude: parseCoord(latText),
                longitude: parseCoord(lngText),
                area_ha: parseCoord(areaText),
              })
              onOpenChange(false)
            })()
          }}
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

            {field && legacyCropLabel ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Устаревшая запись культуры: {legacyCropLabel}
                </p>
                <p className="mt-1">
                  Культура и сорт задаются в карточке культуры/посева на странице поля. Это
                  значение нельзя изменить здесь.
                </p>
              </div>
            ) : null}

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
                  Вручную или из контура на карте. Культуру добавьте после сохранения поля.
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
              flushRef={contourFlushRef}
              onChange={(next) => {
                form.setValue('polygon', next.polygon, { shouldDirty: true })
                if (next.areaHa != null) {
                  setAreaText(String(next.areaHa))
                  form.setValue('area_ha', next.areaHa, { shouldDirty: true })
                }
                if (next.syncWeatherPoint && next.latitude != null && next.longitude != null) {
                  setLatText(String(next.latitude))
                  setLngText(String(next.longitude))
                  form.setValue('latitude', next.latitude, { shouldDirty: true })
                  form.setValue('longitude', next.longitude, { shouldDirty: true })
                }
              }}
            />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="field-description">Описание</Label>
            <Textarea id="field-description" rows={2} {...form.register('description')} />
          </div>

          <section className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm"
              onClick={() => setExtrasOpen((v) => !v)}
            >
              <span className="font-medium text-foreground">Погодная точка (дополнительно)</span>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${extrasOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {extrasOpen ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="field-lat">Широта</Label>
                  <Input
                    id="field-lat"
                    className="min-h-11 sm:min-h-10"
                    inputMode="decimal"
                    value={latText}
                    onChange={(e) => syncCoordField('latitude', e.target.value)}
                  />
                  {latError ? (
                    <p className="text-xs text-destructive">{latError.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-lng">Долгота</Label>
                  <Input
                    id="field-lng"
                    className="min-h-11 sm:min-h-10"
                    inputMode="decimal"
                    value={lngText}
                    onChange={(e) => syncCoordField('longitude', e.target.value)}
                  />
                  {lngError ? (
                    <p className="text-xs text-destructive">{lngError.message}</p>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <Button type="button" variant="outline" className="min-h-11 sm:min-h-10" onClick={fillGeolocation}>
                    <MapPin className="size-4" />
                    Моё местоположение
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              disabled={isPending}
            >
              {isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
