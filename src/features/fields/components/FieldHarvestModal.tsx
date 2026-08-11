import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2, Wheat } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useInventory } from '@/features/inventory/hooks'
import { numberInputRegister } from '@/lib/formNumbers'
import { selectOptions } from '@/lib/selectOptions'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import type { FieldResponse } from '../types'
import {
  fieldEffectiveCropCode,
  fieldHarvestBlockReason,
  harvestItemsMatchingCrop,
} from '../fieldHarvest'
import { fieldHarvestSchema, type FieldHarvestFormValues } from '../harvestSchema'
import { useFieldHarvest } from '../hooks'
import { useFieldPlantings } from '../plantingHooks'

type FieldHarvestModalProps = {
  open: boolean
  field: FieldResponse | null
  onClose: () => void
  onEditField?: (field: FieldResponse) => void
}

export function FieldHarvestModal({
  open,
  field,
  onClose,
  onEditField,
}: FieldHarvestModalProps) {
  const navigate = useNavigate()
  const seasonYear = new Date().getFullYear()
  const { data: items = [], isLoading } = useInventory({ category: 'harvest' })
  const { data: crops = [] } = useDictionary('crop')
  const { data: plantings = [], isLoading: plantingsLoading } = useFieldPlantings(field?.id, {
    seasonYear,
    includeHarvest: false,
    enabled: open && Boolean(field?.id),
  })
  const activePlantings = useMemo(
    () => plantings.filter((p) => p.status !== 'cancelled'),
    [plantings],
  )
  const harvest = useFieldHarvest()

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FieldHarvestFormValues>({
    resolver: zodResolver(fieldHarvestSchema),
    defaultValues: {
      inventoryItemId: '',
      fieldPlantingId: '',
      harvestStatus: 'partially_harvested',
      quantity: undefined,
      date: formatApiDate(new Date()),
    },
  })

  const selectedPlantingId = useWatch({ control, name: 'fieldPlantingId' })
  const selectedPlanting = useMemo(
    () => activePlantings.find((p) => p.id === selectedPlantingId) ?? null,
    [activePlantings, selectedPlantingId],
  )

  const effectiveCode = useMemo(() => {
    if (selectedPlanting) return selectedPlanting.cropCode
    if (activePlantings.length === 0 && field) {
      return fieldEffectiveCropCode(field, crops)
    }
    return null
  }, [selectedPlanting, activePlantings.length, field, crops])

  const matching = useMemo(
    () => harvestItemsMatchingCrop(items, effectiveCode),
    [items, effectiveCode],
  )
  const skuOptions = useMemo(
    () =>
      selectOptions(
        matching.map((row) => ({
          value: row.id,
          label: `${row.name} · ${row.currentStock.toLocaleString('ru-RU')} ${row.unit}`,
        })),
      ),
    [matching],
  )

  const plantingOptions = useMemo(
    () =>
      selectOptions(
        activePlantings.map((p) => ({
          value: p.id,
          label: `${p.cropName || p.cropCode}${p.varietyName ? ` · ${p.varietyName}` : ''} · ${p.areaHa} га`,
        })),
      ),
    [activePlantings],
  )

  const legacyBlock =
    activePlantings.length === 0 && field
      ? fieldHarvestBlockReason(field, matching, crops)
      : null
  const multiNeedsPick = activePlantings.length > 1 && !selectedPlanting
  const missingCulture =
    activePlantings.length === 0 &&
    field != null &&
    !(field.crop_code ?? '').trim() &&
    !(field.crop_type ?? '').trim()

  const cropLabel = selectedPlanting
    ? `${selectedPlanting.cropName || selectedPlanting.cropCode}${
        selectedPlanting.varietyName ? ` · ${selectedPlanting.varietyName}` : ''
      }`
    : (field?.crop_type ?? '').trim() ||
      crops.find((row) => row.code === effectiveCode)?.name ||
      effectiveCode ||
      '—'

  useEffect(() => {
    if (!open || !field) return
    const autoId = activePlantings.length === 1 ? activePlantings[0].id : ''
    reset({
      inventoryItemId: '',
      fieldPlantingId: autoId,
      harvestStatus: 'partially_harvested',
      quantity: undefined,
      date: formatApiDate(new Date()),
    })
  }, [open, field?.id, activePlantings.length, reset])

  useEffect(() => {
    if (!open) return
    setValue('inventoryItemId', matching[0]?.id ?? '')
  }, [open, selectedPlantingId, matching[0]?.id, setValue])

  const pending = isSubmitting || harvest.isPending
  const blockReason =
    legacyBlock ||
    (activePlantings.length > 0 && matching.length === 0 && selectedPlanting
      ? 'Нет складской позиции урожая с этой культурой. Создайте её на складе.'
      : null)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Собрать урожай{field ? `: ${field.name}` : ''}</DialogTitle>
        </DialogHeader>

        {isLoading || plantingsLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : blockReason && activePlantings.length === 0 ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm text-foreground">{blockReason}</p>
            {onEditField && field && (missingCulture || !effectiveCode) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose()
                  onEditField(field)
                }}
              >
                Указать культуру поля
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-8"
                onClick={() => {
                  onClose()
                  void navigate({ to: '/inventory', search: { category: 'harvest' } })
                }}
              >
                Перейти
              </Button>
            )}
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              if (!field) return
              if (activePlantings.length > 1 && !values.fieldPlantingId) {
                toast.error('Выберите культуру на поле')
                return
              }
              await harvest.mutateAsync({
                fieldId: field.id,
                inventoryItemId: values.inventoryItemId,
                quantity: values.quantity,
                date: values.date,
                fieldPlantingId: values.fieldPlantingId || undefined,
                harvestStatus: values.harvestStatus,
              })
              toast.success('Урожай оприходован на склад', {
                action: {
                  label: 'Склад',
                  onClick: () => {
                    window.location.assign('/inventory?category=harvest')
                  },
                },
              })
              onClose()
            })}
          >
            {activePlantings.length > 0 ? (
              <div className="space-y-2">
                <Label>Культура на поле</Label>
                <Controller
                  name="fieldPlantingId"
                  control={control}
                  render={({ field: f }) => (
                    <LabeledSelect
                      value={f.value || null}
                      onValueChange={(value) => f.onChange(value ?? '')}
                      options={plantingOptions}
                      placeholder="Выберите посев"
                      disabled={activePlantings.length === 1}
                    />
                  )}
                />
                {selectedPlanting ? (
                  <p className="text-xs text-muted-foreground">
                    Будет собрано: {cropLabel} ({selectedPlanting.areaHa} га). Культуру/сорт
                    нельзя заменить вручную.
                  </p>
                ) : multiNeedsPick ? (
                  <p className="text-xs text-destructive">
                    На поле несколько культур — выберите запись для сбора.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Культура поля: {cropLabel}. Приход только на склад (не создаёт запись в
                «Отгрузках урожая»).
              </p>
            )}

            <div className="space-y-2">
              <Label>Позиция урожая</Label>
              <Controller
                name="inventoryItemId"
                control={control}
                render={({ field: f }) => (
                  <LabeledSelect
                    value={f.value || null}
                    onValueChange={(value) => f.onChange(value ?? '')}
                    options={skuOptions}
                    placeholder="Выберите позицию"
                    disabled={skuOptions.length === 0 || multiNeedsPick}
                    aria-invalid={Boolean(errors.inventoryItemId) || undefined}
                  />
                )}
              />
              {errors.inventoryItemId ? (
                <p className="text-xs text-destructive">{errors.inventoryItemId.message}</p>
              ) : null}
              {blockReason && activePlantings.length > 0 ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-destructive">{blockReason}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 shrink-0 sm:min-h-8"
                    onClick={() => {
                      onClose()
                      void navigate({ to: '/inventory', search: { category: 'harvest' } })
                    }}
                  >
                    Перейти
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Статус после сбора</Label>
              <Controller
                name="harvestStatus"
                control={control}
                render={({ field: f }) => (
                  <LabeledSelect
                    value={f.value ?? 'partially_harvested'}
                    onValueChange={(value) =>
                      f.onChange(
                        (value as 'partially_harvested' | 'harvested') ??
                          'partially_harvested',
                      )
                    }
                    options={selectOptions([
                      { value: 'partially_harvested', label: 'Частично убрано' },
                      { value: 'harvested', label: 'Убрано' },
                    ])}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fh-qty">Количество, кг</Label>
              <Input
                id="fh-qty"
                type="number"
                min={0}
                step="any"
                {...register('quantity', numberInputRegister)}
              />
              {errors.quantity ? (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Дата</Label>
              <Controller
                name="date"
                control={control}
                render={({ field: f }) => (
                  <Popover>
                    <PopoverTrigger className="inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm font-normal">
                      <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {f.value
                          ? format(parseApiDate(f.value), 'd MMMM yyyy', { locale: ru })
                          : 'Выберите дату'}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={f.value ? parseApiDate(f.value) : undefined}
                        onSelect={(d) => d && f.onChange(formatApiDate(d))}
                        disabled={{ after: new Date() }}
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={pending || multiNeedsPick || matching.length === 0}
                className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Wheat className="size-4" />}
                Оприходовать
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
