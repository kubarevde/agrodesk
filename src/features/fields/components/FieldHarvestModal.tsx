import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2, Wheat } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
  const { data: items = [], isLoading } = useInventory({ category: 'harvest' })
  const { data: crops = [] } = useDictionary('crop')
  const harvest = useFieldHarvest()
  const effectiveCode = useMemo(
    () => (field ? fieldEffectiveCropCode(field, crops) : null),
    [field, crops],
  )
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
  const blockReason = field ? fieldHarvestBlockReason(field, matching, crops) : null
  const missingCulture =
    field != null &&
    !(field.crop_code ?? '').trim() &&
    !(field.crop_type ?? '').trim()
  const cropLabel =
    (field?.crop_type ?? '').trim() ||
    crops.find((row) => row.code === effectiveCode)?.name ||
    effectiveCode ||
    '—'

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FieldHarvestFormValues>({
    resolver: zodResolver(fieldHarvestSchema),
    defaultValues: {
      inventoryItemId: '',
      quantity: undefined,
      date: formatApiDate(new Date()),
    },
  })

  useEffect(() => {
    if (!open || !field) return
    reset({
      inventoryItemId: matching[0]?.id ?? '',
      quantity: undefined,
      date: formatApiDate(new Date()),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when dialog opens
  }, [open, field?.id, matching[0]?.id, reset])

  const pending = isSubmitting || harvest.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Собрать урожай{field ? `: ${field.name}` : ''}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка склада…</p>
        ) : blockReason ? (
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
                onClick={() => {
                  onClose()
                  void navigate({ to: '/inventory' })
                }}
              >
                Открыть склад
              </Button>
            )}
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              if (!field) return
              await harvest.mutateAsync({
                fieldId: field.id,
                inventoryItemId: values.inventoryItemId,
                quantity: values.quantity,
                date: values.date,
              })
              toast.success('Урожай оприходован на склад', {
                action: {
                  label: 'Склад',
                  onClick: () => {
                    window.location.assign('/inventory')
                  },
                },
              })
              onClose()
            })}
          >
            <p className="text-xs text-muted-foreground">
              Культура поля: {cropLabel}. Приход только на склад
              (не создаёт запись в «Отгрузках урожая»).
            </p>

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
                    disabled={skuOptions.length === 0}
                    aria-invalid={Boolean(errors.inventoryItemId) || undefined}
                  />
                )}
              />
              {errors.inventoryItemId ? (
                <p className="text-xs text-destructive">{errors.inventoryItemId.message}</p>
              ) : null}
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
                disabled={pending}
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
