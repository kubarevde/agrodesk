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
import { formatApiDate } from '@/features/worktime/utils'
import { useAddMaintenance } from '../hooks'
import { maintenanceFormSchema, type MaintenanceFormValues } from '../schemas'

const EMPTY_TYPES: DictionaryItem[] = []

type MaintenanceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentId: string
  meterLabel: string
  currentMeter: number
  /** Soft fallback interval from equipment card (not forced). */
  toInterval?: number | null
}

function suggestNextAt(
  meterAt: number,
  typeInterval: number | null | undefined,
  equipmentInterval: number | null | undefined,
): number | undefined {
  const hint = typeInterval ?? equipmentInterval
  if (hint == null || !(hint > 0)) return undefined
  return Number((meterAt + hint).toFixed(2))
}

export function MaintenanceModal({
  open,
  onOpenChange,
  equipmentId,
  meterLabel,
  currentMeter,
  toInterval = null,
}: MaintenanceModalProps) {
  const addMaintenance = useAddMaintenance(equipmentId)
  const { data } = useDictionary('maintenance_type')
  const types = data ?? EMPTY_TYPES
  const nextTouchedRef = useRef(false)
  const wasOpenRef = useRef(false)

  const typeOptions = useMemo(
    () => buildDictionarySelectOptions(types, { valueKey: 'name' }),
    [types],
  )
  const defaultTypeName = types[0]?.name ?? 'ТО-1'
  const defaultTypeInterval = types[0]?.default_interval

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      date: formatApiDate(new Date()),
      type: '',
      meter_at: currentMeter,
      cost: undefined,
      description: '',
      next_to_at: undefined,
    },
  })

  const selectedType = useWatch({ control: form.control, name: 'type' })
  const selectedTypeInterval = useMemo(() => {
    const row = types.find((item) => item.name === selectedType)
    return row?.default_interval ?? null
  }, [selectedType, types])
  const selectedTypeLabel = selectedType || ''

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
    const suggested = suggestNextAt(currentMeter, defaultTypeInterval, toInterval)
    form.reset({
      date: formatApiDate(new Date()),
      type: defaultTypeName,
      meter_at: currentMeter,
      cost: undefined,
      description: '',
      next_to_at: suggested,
    })
    // Intentional: reset only on open transition (not on every types/form identity change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // When dictionary loads after open, fill type once if still empty.
  useEffect(() => {
    if (!open || types.length === 0) return
    if (form.getValues('type')) return
    const suggested = suggestNextAt(currentMeter, defaultTypeInterval, toInterval)
    form.setValue('type', defaultTypeName)
    if (!nextTouchedRef.current && suggested != null) {
      form.setValue('next_to_at', suggested, { shouldDirty: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTypeName, defaultTypeInterval])

  // Soft-update next hint when type changes (unless user edited the field).
  useEffect(() => {
    if (!open || nextTouchedRef.current || !selectedType) return
    const base = form.getValues('meter_at') ?? currentMeter
    const suggested = suggestNextAt(base, selectedTypeInterval, toInterval)
    if (suggested == null) return
    if (form.getValues('next_to_at') === suggested) return
    form.setValue('next_to_at', suggested, { shouldDirty: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedType, selectedTypeInterval, toInterval, currentMeter])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Записать ТО</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await addMaintenance.mutateAsync(values)
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
            <Label htmlFor="to-date">Дата</Label>
            <Controller
              name="date"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  id="to-date"
                  value={field.value}
                  onChange={(next) => {
                    if (next) field.onChange(next)
                  }}
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="to-meter">Показатель при ТО ({meterLabel})</Label>
            <Input
              id="to-meter"
              type="number"
              step="any"
              className="min-h-11"
              {...form.register('meter_at', {
                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
              })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="to-cost">Стоимость ₽</Label>
            <Input
              id="to-cost"
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
            <Label htmlFor="to-next">Следующее ТО на ({meterLabel})</Label>
            <Input
              id="to-next"
              type="number"
              step="any"
              className="min-h-11"
              {...form.register('next_to_at', {
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
              Сейчас: {currentMeter.toLocaleString('ru-RU')} {meterLabel}
              {selectedTypeInterval != null
                ? ` · подсказка типа «${selectedTypeLabel}»: +${selectedTypeInterval} ${meterLabel}`
                : toInterval != null && toInterval > 0
                  ? ` · интервал техники: +${toInterval} ${meterLabel}`
                  : ''}
              . Укажите абсолютное показание следующего ТО.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="to-desc">Описание</Label>
            <Textarea id="to-desc" rows={3} {...form.register('description')} />
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
