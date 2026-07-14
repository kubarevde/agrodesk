import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2, Plus } from 'lucide-react'
import { useEffect } from 'react'
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
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import {
  useCreateShipment,
  useUpdateShipment,
} from '@/features/shipments/hooks'
import { shipmentSchema, type ShipmentFormValues } from '@/features/shipments/schemas'
import { calcShipmentSum, CROP_TYPES, formatMoney } from '@/features/shipments/utils'

interface ShipmentFormModalProps {
  open: boolean
  shipment?: Shipment | null
  onClose: () => void
}

function getDefaultValues(): ShipmentFormValues {
  return {
    date: formatApiDate(new Date()),
    cropType: 'Пшеница',
    quantityKg: 0,
    destination: '',
    pricePerKg: 0,
    notes: '',
  }
}

function toFormValues(shipment: Shipment): ShipmentFormValues {
  return {
    date: shipment.date,
    cropType: shipment.cropType as ShipmentFormValues['cropType'],
    quantityKg: shipment.quantityKg,
    destination: shipment.destination ?? '',
    pricePerKg: shipment.pricePerKg ?? 0,
    notes: shipment.notes ?? '',
  }
}

export function ShipmentFormModal({ open, shipment, onClose }: ShipmentFormModalProps) {
  const isEdit = Boolean(shipment)
  const createShipment = useCreateShipment()
  const updateShipment = useUpdateShipment()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: getDefaultValues(),
  })

  const quantityKg = useWatch({ control, name: 'quantityKg' }) ?? 0
  const pricePerKg = useWatch({ control, name: 'pricePerKg' }) ?? 0
  const liveSum = calcShipmentSum(Number(quantityKg) || 0, Number(pricePerKg) || 0)

  useEffect(() => {
    if (!open) {
      reset(getDefaultValues())
      return
    }
    reset(shipment ? toFormValues(shipment) : getDefaultValues())
  }, [open, reset, shipment])

  const handleClose = () => {
    reset(getDefaultValues())
    onClose()
  }

  const onSubmit = async (values: ShipmentFormValues) => {
    if (shipment) {
      await updateShipment.mutateAsync({ id: shipment.id, ...values })
    } else {
      await createShipment.mutateAsync(values)
    }
    handleClose()
  }

  const pending = isSubmitting || createShipment.isPending || updateShipment.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
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
              name="cropType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-invalid={Boolean(errors.cropType)}>
                    <SelectValue placeholder="Выберите культуру" />
                  </SelectTrigger>
                  <SelectContent>
                    {CROP_TYPES.map((crop) => (
                      <SelectItem key={crop} value={crop}>
                        {crop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.cropType ? (
              <p className="text-xs text-destructive">{errors.cropType.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantityKg">Количество (кг)</Label>
            <Input
              id="quantityKg"
              type="number"
              min={0}
              step="any"
              aria-invalid={Boolean(errors.quantityKg)}
              {...register('quantityKg', { valueAsNumber: true })}
            />
            {errors.quantityKg ? (
              <p className="text-xs text-destructive">{errors.quantityKg.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Направление/Покупатель</Label>
            <Input
              id="destination"
              placeholder="Элеватор / ООО «Агро»"
              aria-invalid={Boolean(errors.destination)}
              {...register('destination')}
            />
            {errors.destination ? (
              <p className="text-xs text-destructive">{errors.destination.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricePerKg">Цена за кг (₽)</Label>
            <Input
              id="pricePerKg"
              type="number"
              min={0}
              step="any"
              aria-invalid={Boolean(errors.pricePerKg)}
              {...register('pricePerKg', { valueAsNumber: true })}
            />
            {errors.pricePerKg ? (
              <p className="text-xs text-destructive">{errors.pricePerKg.message}</p>
            ) : null}
          </div>

          <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
            Сумма: {formatMoney(liveSum)}
          </p>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечание</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={pending}
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
