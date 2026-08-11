import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2, Plus } from 'lucide-react'
import { useEffect, useMemo } from 'react'
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
import type { TmcShipment } from '@/types'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useInventory } from '@/features/inventory/hooks'
import { getCategoryLabel, isHarvestCategory } from '@/features/inventory/utils'
import { selectableInventoryItemsForRequest } from '@/features/shipment-requests/itemSelect'
import { useShipmentRequests } from '@/features/shipment-requests/hooks'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import { numberInputRegister } from '@/lib/formNumbers'
import { selectOptions } from '@/lib/selectOptions'
import { LabeledSelect } from '@/components/ui/labeled-select'
import {
  NONE_REQUEST_VALUE,
  harvestRequestOptionLabel,
  remainingKgForRequest,
} from '../requestLink'
import { useCreateTmcShipment, useTmcShipments, useUpdateTmcShipment } from '../tmcHooks'
import { tmcShipmentSchema, type TmcShipmentFormValues } from '../tmcSchemas'
import { calcTmcSum, formatTmcMoney, usedQtyForRequestLink } from '../tmcUtils'
import { isoDateToDisplay } from '@/lib/dates'

type Props = {
  open: boolean
  shipment?: TmcShipment | null
  onClose: () => void
}

function defaults(): Partial<TmcShipmentFormValues> {
  return {
    date: formatApiDate(new Date()),
    category: '',
    inventoryItemId: '',
    quantity: undefined,
    destination: '',
    pricePerUnit: undefined,
    notes: '',
    shipmentRequestId: NONE_REQUEST_VALUE,
  }
}

function toForm(row: TmcShipment): Partial<TmcShipmentFormValues> {
  return {
    date: row.date,
    category: row.category,
    inventoryItemId: row.inventoryItemId,
    quantity: row.quantity,
    destination: row.destination ?? '',
    pricePerUnit: row.pricePerUnit ?? undefined,
    notes: row.notes ?? '',
    shipmentRequestId: row.shipmentRequestId || NONE_REQUEST_VALUE,
  }
}

export function TmcShipmentFormModal({ open, shipment, onClose }: Props) {
  const isEdit = Boolean(shipment)
  const create = useCreateTmcShipment()
  const update = useUpdateTmcShipment()
  const { data: categories = [] } = useDictionary('inventory_category')
  const { data: items = [] } = useInventory({ enabled: open })
  const { data: linkedShipments = [] } = useTmcShipments({}, open)
  const { data: inventoryDone = [] } = useShipmentRequests(
    { kind: 'inventory', status: 'done' },
    open,
  )

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TmcShipmentFormValues>({
    resolver: zodResolver(tmcShipmentSchema),
    defaultValues: defaults(),
  })

  const category = useWatch({ control, name: 'category' })
  const inventoryItemId = useWatch({ control, name: 'inventoryItemId' })
  const quantity = useWatch({ control, name: 'quantity' }) ?? 0
  const pricePerUnit = useWatch({ control, name: 'pricePerUnit' }) ?? 0
  const shipmentRequestId = useWatch({ control, name: 'shipmentRequestId' })

  const selectedItem = useMemo(
    () => items.find((i) => i.id === inventoryItemId) ?? null,
    [items, inventoryItemId],
  )
  const unit = (selectedItem?.unit ?? shipment?.unit ?? '').trim()
  const liveSum = calcTmcSum(Number(quantity) || 0, Number(pricePerUnit) || 0)

  const categoryOptions = selectOptions(
    categories
      .filter((row) => !isHarvestCategory(row.code))
      .map((row) => ({
        value: row.code,
        label: row.name || getCategoryLabel(row.code),
      })),
  )
  const itemOptions = selectOptions(
    selectableInventoryItemsForRequest(items, category, { excludeHarvest: true }).map((item) => ({
      value: item.id,
      label: `${item.name}${item.unit ? ` (${item.unit})` : ''}`,
    })),
  )

  const requestItems = useMemo(() => {
    const forItem = inventoryItemId
      ? inventoryDone.filter((r) => r.inventoryItemId === inventoryItemId)
      : []
    const keepId =
      shipmentRequestId && shipmentRequestId !== NONE_REQUEST_VALUE
        ? shipmentRequestId
        : shipment?.shipmentRequestId ?? null
    const rows = forItem
      .map((row) => {
        const used = usedQtyForRequestLink(linkedShipments, row.id, shipment?.id)
        const remaining = remainingKgForRequest(row.quantity, used)
        return { row, remaining }
      })
      .filter(({ row, remaining }) => remaining > 0 || row.id === keepId)
      .map(({ row, remaining }) => ({
        value: row.id,
        label: harvestRequestOptionLabel(row, remaining),
      }))
    if (keepId && !rows.some((r) => r.value === keepId)) {
      rows.unshift({ value: keepId, label: `Заявка ${keepId.slice(0, 8)}…` })
    }
    return [{ value: NONE_REQUEST_VALUE, label: 'Без заявки' }, ...rows]
  }, [
    inventoryDone,
    inventoryItemId,
    linkedShipments,
    shipment?.id,
    shipment?.shipmentRequestId,
    shipmentRequestId,
  ])

  useEffect(() => {
    if (!open) {
      reset(defaults())
      return
    }
    reset(shipment ? toForm(shipment) : defaults())
  }, [open, reset, shipment?.id])

  const applyRequest = (requestId: string) => {
    const row = inventoryDone.find((r) => r.id === requestId)
    if (!row) return
    const used = usedQtyForRequestLink(linkedShipments, row.id, shipment?.id)
    const remaining = remainingKgForRequest(row.quantity, used)
    setValue('quantity', remaining > 0 ? remaining : row.quantity, { shouldValidate: true })
    setValue('pricePerUnit', row.price, { shouldValidate: true })
    setValue('destination', row.customerName, { shouldValidate: true })
    if (row.completedAt) {
      const day = row.completedAt.slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        setValue('date', isoDateToDisplay(day), { shouldValidate: true })
      }
    }
    if (row.inventoryItemId) {
      const item = items.find((i) => i.id === row.inventoryItemId)
      if (item && !isHarvestCategory(item.category)) {
        setValue('category', item.category, { shouldValidate: true })
        setValue('inventoryItemId', item.id, { shouldValidate: true })
      }
    }
  }

  const onSubmit = async (values: TmcShipmentFormValues) => {
    if (shipment) {
      await update.mutateAsync({ id: shipment.id, ...values })
    } else {
      await create.mutateAsync(values)
    }
    onClose()
  }

  const pending = isSubmitting || create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать отгрузку ТМЦ' : 'Добавить отгрузку ТМЦ'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Дата</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger className="inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input px-3 text-sm">
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
                      onSelect={(d) => field.onChange(d ? formatApiDate(d) : '')}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date ? <p className="text-xs text-destructive">{errors.date.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Категория ТМЦ</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <LabeledSelect
                  value={field.value || null}
                  onValueChange={(value) => {
                    field.onChange(value ?? '')
                    setValue('inventoryItemId', '')
                    setValue('shipmentRequestId', NONE_REQUEST_VALUE)
                  }}
                  options={categoryOptions}
                  placeholder="Выберите категорию"
                />
              )}
            />
            {errors.category ? (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Позиция ТМЦ</Label>
            <Controller
              name="inventoryItemId"
              control={control}
              render={({ field }) => (
                <LabeledSelect
                  value={field.value || null}
                  onValueChange={(value) => {
                    field.onChange(value ?? '')
                    setValue('shipmentRequestId', NONE_REQUEST_VALUE)
                  }}
                  options={itemOptions}
                  placeholder={!category ? 'Сначала выберите категорию' : 'Выберите позицию'}
                  disabled={!category}
                />
              )}
            />
            {errors.inventoryItemId ? (
              <p className="text-xs text-destructive">{errors.inventoryItemId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Label>Связь с заявкой на отгрузку ТМЦ</Label>
            <Controller
              name="shipmentRequestId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || NONE_REQUEST_VALUE}
                  onValueChange={(next) => {
                    field.onChange(next)
                    if (next && next !== NONE_REQUEST_VALUE) applyRequest(next)
                  }}
                  items={requestItems}
                  disabled={!inventoryItemId}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Без заявки" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[min(100vw-2rem,32rem)]">
                    {requestItems.map((row) => (
                      <SelectItem key={row.value} value={row.value}>
                        <span className="block truncate">{row.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              {!inventoryItemId
                ? 'Сначала выберите позицию — появятся выполненные заявки по ней.'
                : 'Необязательно. Без заявки — осознанная отгрузка мимо заявки; склад не списывается.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tmc-qty">
              {unit ? `Количество, ${unit}` : 'Количество'}
            </Label>
            <Input
              id="tmc-qty"
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
            <Label htmlFor="tmc-dest">Направление</Label>
            <Input id="tmc-dest" {...register('destination')} />
            {errors.destination ? (
              <p className="text-xs text-destructive">{errors.destination.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tmc-price">{unit ? `Цена за ${unit}` : 'Цена'}</Label>
            <Input
              id="tmc-price"
              type="number"
              min={0}
              step="any"
              {...register('pricePerUnit', numberInputRegister)}
            />
            {errors.pricePerUnit ? (
              <p className="text-xs text-destructive">{errors.pricePerUnit.message}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">Сумма: {formatTmcMoney(liveSum)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tmc-notes">Примечание</Label>
            <Textarea id="tmc-notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isEdit ? 'Сохранить' : 'Добавить отгрузку'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
