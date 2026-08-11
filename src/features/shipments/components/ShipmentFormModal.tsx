import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Shipment } from '@/types'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { CropVarietySelect } from '@/components/shared/CropVarietySelect'
import { FieldPlantingSelect } from '@/components/shared/FieldPlantingSelect'
import { buildDictionarySelectOptions } from '@/features/dictionaries/labels'
import { useDictionary } from '@/features/dictionaries/hooks'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import {
  useCreateShipment,
  useShipments,
  useUpdateShipment,
} from '@/features/shipments/hooks'
import { shipmentSchema, type ShipmentFormValues } from '@/features/shipments/schemas'
import { calcShipmentSum, formatMoney } from '@/features/shipments/utils'
import {
  NONE_REQUEST_VALUE,
  harvestRequestOptionLabel,
  isHarvestRequestSelectable,
  remainingKgForRequest,
  requestAutofillValues,
  usedKgForRequest,
} from '@/features/shipments/requestLink'
import { useShipmentRequests } from '@/features/shipment-requests/hooks'
import { numberInputRegister } from '@/lib/formNumbers'

interface ShipmentFormModalProps {
  open: boolean
  shipment?: Shipment | null
  onClose: () => void
  initialRequestId?: string | null
}

function getDefaultValues(
  defaultCode = '',
  defaultName = '',
  requestId = '',
): Partial<ShipmentFormValues> {
  return {
    date: formatApiDate(new Date()),
    cropCode: defaultCode,
    cropType: defaultName,
    quantityKg: undefined,
    destination: '',
    pricePerKg: undefined,
    notes: '',
    shipmentRequestId: requestId || NONE_REQUEST_VALUE,
    varietyId: '',
    fieldId: '',
    fieldPlantingId: '',
  }
}

function toFormValues(shipment: Shipment): Partial<ShipmentFormValues> {
  return {
    date: shipment.date,
    cropCode: shipment.cropCode ?? shipment.cropType,
    cropType: shipment.cropType,
    quantityKg: shipment.quantityKg,
    destination: shipment.destination ?? '',
    pricePerKg: shipment.pricePerKg ?? undefined,
    notes: shipment.notes ?? '',
    shipmentRequestId: shipment.shipmentRequestId || NONE_REQUEST_VALUE,
    varietyId: shipment.varietyId ?? '',
    fieldId: shipment.fieldId ?? '',
    fieldPlantingId: shipment.fieldPlantingId ?? '',
  }
}

export function ShipmentFormModal({
  open,
  shipment,
  onClose,
  initialRequestId = null,
}: ShipmentFormModalProps) {
  const isEdit = Boolean(shipment)
  const createShipment = useCreateShipment()
  const updateShipment = useUpdateShipment()
  const { data: crops = [], isLoading: cropsLoading } = useDictionary('crop')
  const firstCrop = crops[0]
  const firstCode = firstCrop?.code ?? ''
  const firstName = firstCrop?.name ?? ''
  const cropItems = useMemo(
    () =>
      buildDictionarySelectOptions(crops, {
        valueKey: 'code',
        orphanValue: shipment?.cropCode ?? shipment?.cropType,
        orphanLabel: shipment?.cropType,
      }),
    [crops, shipment?.cropCode, shipment?.cropType],
  )
  const dictionaryEmpty = !cropsLoading && crops.length === 0 && !shipment?.cropType

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: getDefaultValues(firstCode, firstName),
  })

  const quantityKg = useWatch({ control, name: 'quantityKg' }) ?? 0
  const pricePerKg = useWatch({ control, name: 'pricePerKg' }) ?? 0
  const cropCode = useWatch({ control, name: 'cropCode' })
  const shipmentRequestId = useWatch({ control, name: 'shipmentRequestId' })
  const fieldPlantingIdWatch = useWatch({ control, name: 'fieldPlantingId' })
  const selectedCrop = (cropCode ?? '').trim()

  const { data: harvestDoneAll = [] } = useShipmentRequests(
    { kind: 'harvest', status: 'done' },
    open,
  )
  const harvestDone = useMemo(() => {
    if (!selectedCrop) return []
    return harvestDoneAll.filter((row) => (row.cropCode ?? '').trim() === selectedCrop)
  }, [harvestDoneAll, selectedCrop])
  const { data: linkedShipments = [] } = useShipments({}, open)

  const prefillAppliedRef = useRef<string | null>(null)

  const applyAutofill = (requestId: string) => {
    const row = harvestDoneAll.find((r) => r.id === requestId)
    if (!row) return
    const used = usedKgForRequest(linkedShipments, row.id, shipment?.id)
    const remaining = remainingKgForRequest(row.quantity, used)
    const values = requestAutofillValues(row, remaining)
    if (row.cropCode) {
      const crop = crops.find((c) => c.code === row.cropCode)
      setValue('cropCode', row.cropCode, { shouldValidate: true, shouldDirty: true })
      setValue('cropType', crop?.name ?? row.cropCode, { shouldValidate: true, shouldDirty: true })
    }
    setValue('varietyId', row.varietyId ?? '', { shouldValidate: true, shouldDirty: true })
    setValue('fieldId', row.fieldId ?? '', { shouldValidate: true, shouldDirty: true })
    setValue('fieldPlantingId', row.fieldPlantingId ?? '', {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue('quantityKg', values.quantityKg, { shouldValidate: true, shouldDirty: true })
    setValue('pricePerKg', values.pricePerKg, { shouldValidate: true, shouldDirty: true })
    setValue('destination', values.destination, { shouldValidate: true, shouldDirty: true })
    setValue('date', values.date, { shouldValidate: true, shouldDirty: true })
  }

  const requestItems = useMemo(() => {
    const keepId =
      (shipmentRequestId && shipmentRequestId !== NONE_REQUEST_VALUE
        ? shipmentRequestId
        : shipment?.shipmentRequestId) ?? null
    const rows = harvestDone
      .filter((row) =>
        isHarvestRequestSelectable(row, linkedShipments, {
          excludeShipmentId: shipment?.id,
          keepRequestId: keepId,
        }),
      )
      .map((row) => {
        const used = usedKgForRequest(linkedShipments, row.id, shipment?.id)
        const remaining = remainingKgForRequest(row.quantity, used)
        return {
          value: row.id,
          label: harvestRequestOptionLabel(row, remaining),
          title: `${row.customerName} · ${row.inventoryItemName ?? 'Урожай'} · остаток ${remaining.toLocaleString('ru-RU')} кг`,
        }
      })
    if (keepId && !rows.some((row) => row.value === keepId)) {
      rows.unshift({
        value: keepId,
        label: `Заявка ${keepId.slice(0, 8)}…`,
        title: keepId,
      })
    }
    return [{ value: NONE_REQUEST_VALUE, label: 'Без заявки', title: 'Без заявки' }, ...rows]
  }, [harvestDone, linkedShipments, shipment?.id, shipment?.shipmentRequestId, shipmentRequestId])

  const liveSum = calcShipmentSum(Number(quantityKg) || 0, Number(pricePerKg) || 0)
  const availableForCrop = useMemo(
    () =>
      harvestDone.filter((row) =>
        isHarvestRequestSelectable(row, linkedShipments, {
          excludeShipmentId: shipment?.id,
        }),
      ),
    [harvestDone, linkedShipments, shipment?.id],
  )
  const similarRequestHint =
    !isEdit &&
    availableForCrop.length > 0 &&
    (!shipmentRequestId || shipmentRequestId === NONE_REQUEST_VALUE)
      ? ` По культуре есть ${availableForCrop.length} выполн. заявки — можно привязать.`
      : ''

  useEffect(() => {
    if (!open) {
      reset(getDefaultValues(firstCode, firstName))
      prefillAppliedRef.current = null
      return
    }
    reset(
      shipment
        ? toFormValues(shipment)
        : getDefaultValues(firstCode, firstName, initialRequestId ?? ''),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset, shipment?.id, firstCode, firstName, initialRequestId])

  useEffect(() => {
    if (!open || isEdit || !initialRequestId) return
    if (prefillAppliedRef.current === initialRequestId) return
    if (!harvestDoneAll.some((r) => r.id === initialRequestId)) return
    setValue('shipmentRequestId', initialRequestId)
    applyAutofill(initialRequestId)
    prefillAppliedRef.current = initialRequestId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, initialRequestId, harvestDoneAll, linkedShipments, crops])

  useEffect(() => {
    if (!selectedCrop) return
    const linked = shipmentRequestId
    if (!linked || linked === NONE_REQUEST_VALUE) return
    // Wait until done-harvest list is loaded — clearing too early drops ?requestId= prefill.
    if (harvestDoneAll.length === 0) return
    const row = harvestDoneAll.find((r) => r.id === linked)
    if (!row) {
      setValue('shipmentRequestId', NONE_REQUEST_VALUE)
      return
    }
    const requestCrop = (row.cropCode ?? '').trim()
    if (requestCrop && requestCrop !== selectedCrop) {
      setValue('shipmentRequestId', NONE_REQUEST_VALUE)
    }
  }, [selectedCrop, harvestDoneAll, shipmentRequestId, setValue])

  const handleClose = () => {
    reset(getDefaultValues(firstCode, firstName))
    prefillAppliedRef.current = null
    onClose()
  }

  const onSubmit = async (values: ShipmentFormValues) => {
    const payload = {
      ...values,
      shipmentRequestId:
        values.shipmentRequestId && values.shipmentRequestId !== NONE_REQUEST_VALUE
          ? values.shipmentRequestId
          : '',
    }
    if (shipment) {
      await updateShipment.mutateAsync({ id: shipment.id, ...payload })
    } else {
      await createShipment.mutateAsync(payload)
    }
    handleClose()
  }

  const pending = isSubmitting || createShipment.isPending || updateShipment.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать отгрузку' : 'Добавить отгрузку'}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Дата</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger
                    className="inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input px-3 text-sm"
                    aria-invalid={Boolean(errors.date)}
                  >
                    <CalendarIcon className="size-4 text-muted-foreground" />
                    {field.value
                      ? format(parseApiDate(field.value), 'dd MMMM yyyy', { locale: ru })
                      : 'Выберите дату'}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      locale={ru}
                      selected={field.value ? parseApiDate(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? formatApiDate(date) : '')}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date ? (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Культура</Label>
            <Controller
              name="cropCode"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(code) => {
                    const next = code ?? ''
                    const row = crops.find((crop) => crop.code === next)
                    field.onChange(next)
                    setValue('cropType', row?.name ?? next, { shouldValidate: true })
                    setValue('varietyId', '', { shouldDirty: true })
                    setValue('fieldPlantingId', '', { shouldDirty: true })
                  }}
                  items={cropItems}
                  disabled={dictionaryEmpty}
                >
                  <SelectTrigger className="w-full" aria-invalid={Boolean(errors.cropCode)}>
                    <SelectValue
                      placeholder={
                        dictionaryEmpty
                          ? 'Сначала добавьте культуру в Настройках'
                          : 'Выберите культуру'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {cropItems.map((crop) => (
                      <SelectItem key={crop.value} value={crop.value}>
                        {crop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.cropCode || errors.cropType ? (
              <p className="text-xs text-destructive">
                {errors.cropCode?.message ?? errors.cropType?.message}
              </p>
            ) : (
              <ManageInSettingsLink tab="crops" tabHint="культуры" />
            )}
          </div>

          <Controller
            name="varietyId"
            control={control}
            render={({ field }) => (
              <CropVarietySelect
                cropCode={selectedCrop}
                value={field.value}
                onChange={(id) => field.onChange(id ?? '')}
                showWhenEmpty
              />
            )}
          />

          <FieldPlantingSelect
            cropCode={selectedCrop}
            value={fieldPlantingIdWatch}
            onChange={(id, planting) => {
              setValue('fieldPlantingId', id ?? '', { shouldDirty: true })
              if (planting) {
                const crop = crops.find((c) => c.code === planting.cropCode)
                setValue('cropCode', planting.cropCode, { shouldValidate: true, shouldDirty: true })
                setValue('cropType', crop?.name ?? planting.cropName ?? planting.cropCode, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
                setValue('varietyId', planting.varietyId ?? '', { shouldDirty: true })
                setValue('fieldId', planting.fieldId, { shouldDirty: true })
              }
            }}
            label="Посев / происхождение (необязательно)"
            hideWhenEmpty
          />

          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Label className="text-foreground">Связь с заявкой на урожай</Label>
            <Controller
              name="shipmentRequestId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || NONE_REQUEST_VALUE}
                  onValueChange={(next) => {
                    field.onChange(next)
                    if (next && next !== NONE_REQUEST_VALUE) applyAutofill(next)
                  }}
                  items={requestItems}
                  disabled={!selectedCrop}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Без заявки" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[min(100vw-2rem,32rem)]">
                    {requestItems.map((row) => (
                      <SelectItem
                        key={row.value}
                        value={row.value}
                        className="max-w-full"
                        title={row.title}
                      >
                        <span className="block truncate">{row.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              {!selectedCrop
                ? 'Сначала выберите культуру — появятся выполненные заявки на урожай по ней.'
                : `Рекомендуется: сначала заявка (склад) → затем отгрузка с привязкой. Без заявки — продажа мимо склада; KPI всё равно из этой записи.${similarRequestHint}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantityKg">Количество, кг</Label>
            <Input
              id="quantityKg"
              type="number"
              min={0}
              step="any"
              aria-invalid={Boolean(errors.quantityKg)}
              {...register('quantityKg', numberInputRegister)}
            />
            {errors.quantityKg ? (
              <p className="text-xs text-destructive">{errors.quantityKg.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Направление</Label>
            <Input
              id="destination"
              aria-invalid={Boolean(errors.destination)}
              {...register('destination')}
            />
            {errors.destination ? (
              <p className="text-xs text-destructive">{errors.destination.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricePerKg">Цена за килограмм</Label>
            <Input
              id="pricePerKg"
              type="number"
              min={0}
              step="any"
              aria-invalid={Boolean(errors.pricePerKg)}
              {...register('pricePerKg', numberInputRegister)}
            />
            {errors.pricePerKg ? (
              <p className="text-xs text-destructive">{errors.pricePerKg.message}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">Сумма: {formatMoney(liveSum)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечание</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={pending || dictionaryEmpty}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isEdit ? 'Сохранить' : 'Добавить отгрузку'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
