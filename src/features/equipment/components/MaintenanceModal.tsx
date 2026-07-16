import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import { useAddMaintenance } from '../hooks'
import { maintenanceFormSchema, type MaintenanceFormValues } from '../schemas'
import { EQUIPMENT_MAINTENANCE_TYPES } from '../types'

type MaintenanceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentId: string
  meterLabel: string
  currentMeter: number
}

export function MaintenanceModal({
  open,
  onOpenChange,
  equipmentId,
  meterLabel,
  currentMeter,
}: MaintenanceModalProps) {
  const addMaintenance = useAddMaintenance(equipmentId)
  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      date: formatApiDate(new Date()),
      type: 'ТО-1',
      meter_at: currentMeter,
      cost: undefined,
      description: '',
      next_to_interval: undefined,
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      date: formatApiDate(new Date()),
      type: 'ТО-1',
      meter_at: currentMeter,
      cost: undefined,
      description: '',
      next_to_interval: undefined,
    })
  }, [currentMeter, open])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open / meter only

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
          <div className="space-y-2">
            <Label>Тип</Label>
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={EQUIPMENT_MAINTENANCE_TYPES.map((type) => ({ value: type, label: type }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_MAINTENANCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Дата</Label>
            <Controller
              name="date"
              control={form.control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger className="inline-flex h-9 w-full items-center gap-2 rounded-lg border border-input px-3 text-sm">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-meter">Показатель при ТО</Label>
            <Input
              id="to-meter"
              type="number"
              step="any"
              {...form.register('meter_at', {
                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-cost">Стоимость ₽</Label>
            <Input
              id="to-cost"
              type="number"
              step="0.01"
              {...form.register('cost', {
                setValueAs: (v) => {
                  if (v === '' || v == null) return undefined
                  const n = Number(v)
                  return Number.isNaN(n) ? undefined : n
                },
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-next">Следующее ТО через X {meterLabel}</Label>
            <Input
              id="to-next"
              type="number"
              step="any"
              {...form.register('next_to_interval', {
                setValueAs: (v) => {
                  if (v === '' || v == null) return undefined
                  const n = Number(v)
                  return Number.isNaN(n) ? undefined : n
                },
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-desc">Описание</Label>
            <Textarea id="to-desc" rows={3} {...form.register('description')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={addMaintenance.isPending}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
