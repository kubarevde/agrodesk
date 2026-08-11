import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { DatePicker } from '@/components/shared/DatePicker'
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
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Textarea } from '@/components/ui/textarea'
import {
  useDictionary,
  type DictionaryItem,
} from '@/features/dictionaries/hooks'
import { buildDictionarySelectOptions } from '@/features/dictionaries/labels'
import { formatIsoDate } from '@/lib/dates'
import { useAddImplementMaintenance } from '../hooks'
import { maintenanceFormSchema, type MaintenanceFormValues } from '../schemas'
import type { ImplementResponse } from '../types'

const EMPTY_TYPES: DictionaryItem[] = []

type ImplementMaintenanceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ImplementResponse | null
}

function suggestNextAt(
  meterAt: number,
  typeInterval: number | null | undefined,
  implementInterval: number | null | undefined,
): number | undefined {
  const hint = typeInterval ?? implementInterval
  if (hint == null || !(hint > 0)) return undefined
  return Number((meterAt + hint).toFixed(2))
}

export function ImplementMaintenanceModal({
  open,
  onOpenChange,
  item,
}: ImplementMaintenanceModalProps) {
  const addMaintenance = useAddImplementMaintenance()
  const { data } = useDictionary('maintenance_type')
  const types = data ?? EMPTY_TYPES
  const nextTouchedRef = useRef(false)
  const wasOpenRef = useRef(false)
  const currentHours = item?.current_usage_hours ?? 0
  const toInterval = item?.service_interval_hours ?? null

  const typeOptions = useMemo(
    () => buildDictionarySelectOptions(types, { valueKey: 'name' }),
    [types],
  )
  const defaultTypeName = types[0]?.name ?? 'ТО-1'
  const defaultTypeInterval = types[0]?.default_interval

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      date: formatIsoDate(new Date()),
      type: '',
      meter_at: currentHours,
      cost: undefined,
      description: '',
      next_service_hours: undefined,
      next_service_interval: undefined,
    },
  })

  const selectedType = useWatch({ control: form.control, name: 'type' })
  const selectedTypeInterval = useMemo(() => {
    const row = types.find((entry) => entry.name === selectedType)
    return row?.default_interval ?? null
  }, [selectedType, types])

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      nextTouchedRef.current = false
      return
    }
    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true
    if (!justOpened) return

    nextTouchedRef.current = false
    const suggested = suggestNextAt(currentHours, defaultTypeInterval, toInterval)
    form.reset({
      date: formatIsoDate(new Date()),
      type: defaultTypeName,
      meter_at: currentHours,
      cost: undefined,
      description: '',
      next_service_hours: suggested,
      next_service_interval: toInterval ?? undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open
  }, [open])

  useEffect(() => {
    if (!open || types.length === 0) return
    if (form.getValues('type')) return
    const suggested = suggestNextAt(currentHours, defaultTypeInterval, toInterval)
    form.setValue('type', defaultTypeName)
    if (!nextTouchedRef.current && suggested != null) {
      form.setValue('next_service_hours', suggested, { shouldDirty: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTypeName, defaultTypeInterval])

  useEffect(() => {
    if (!open || nextTouchedRef.current || !selectedType) return
    const base = form.getValues('meter_at') ?? currentHours
    const suggested = suggestNextAt(base, selectedTypeInterval, toInterval)
    if (suggested == null) return
    if (form.getValues('next_service_hours') === suggested) return
    form.setValue('next_service_hours', suggested, { shouldDirty: false })
    if (selectedTypeInterval != null) {
      form.setValue('next_service_interval', selectedTypeInterval, { shouldDirty: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedType, selectedTypeInterval, toInterval, currentHours])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ТО: {item?.name}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!item) return
            await addMaintenance.mutateAsync({ id: item.id, values })
            onOpenChange(false)
          })}
        >
          <LabeledSelect
            label="Тип"
            value={selectedType || null}
            options={typeOptions}
            placeholder="Выберите тип ТО"
            onValueChange={(value) =>
              form.setValue('type', value || '', { shouldValidate: true })
            }
          />

          <div className="space-y-1">
            <Label htmlFor="impl-to-date">Дата</Label>
            <Controller
              name="date"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  id="impl-to-date"
                  value={field.value}
                  onChange={(next) => {
                    if (next) field.onChange(next)
                  }}
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="impl-to-meter">Наработка при ТО (ч)</Label>
            <Input
              id="impl-to-meter"
              type="number"
              step="any"
              className="min-h-11"
              {...form.register('meter_at', {
                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                onChange: () => {
                  if (nextTouchedRef.current) return
                  const base = Number(form.getValues('meter_at') ?? currentHours)
                  const suggested = suggestNextAt(base, selectedTypeInterval, toInterval)
                  if (suggested != null) {
                    form.setValue('next_service_hours', suggested, { shouldDirty: false })
                  }
                },
              })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="impl-to-cost">Стоимость ₽</Label>
            <Input
              id="impl-to-cost"
              type="number"
              step="0.01"
              className="min-h-11"
              {...form.register('cost', {
                setValueAs: (v) => {
                  if (v === '' || v == null) return undefined
                  const n = Number(v)
                  return Number.isNaN(n) ? undefined : n
                },
              })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="impl-to-next">Следующее ТО на (ч)</Label>
            <Input
              id="impl-to-next"
              type="number"
              step="any"
              className="min-h-11"
              {...form.register('next_service_hours', {
                setValueAs: (v) => {
                  if (v === '' || v == null) return undefined
                  const n = Number(v)
                  return Number.isNaN(n) ? undefined : n
                },
                onChange: () => {
                  nextTouchedRef.current = true
                },
              })}
            />
            <p className="text-xs text-muted-foreground">
              Сейчас: {currentHours.toLocaleString('ru-RU')} ч
              {selectedTypeInterval != null
                ? ` · подсказка типа: +${selectedTypeInterval} ч`
                : toInterval != null
                  ? ` · интервал: +${toInterval} ч`
                  : ''}
              . Укажите абсолютное значение следующего ТО.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="impl-to-desc">Описание</Label>
            <Textarea id="impl-to-desc" rows={3} {...form.register('description')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={addMaintenance.isPending || !selectedType}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
