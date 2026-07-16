import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
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
import { useAddImplementMaintenance } from '../hooks'
import { maintenanceFormSchema, type MaintenanceFormValues } from '../schemas'
import { MAINTENANCE_TYPES, type ImplementResponse } from '../types'

type ImplementMaintenanceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ImplementResponse | null
}

export function ImplementMaintenanceModal({
  open,
  onOpenChange,
  item,
}: ImplementMaintenanceModalProps) {
  const addMaintenance = useAddImplementMaintenance()
  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      date: formatApiDate(new Date()),
      type: 'ТО-1',
      cost: undefined,
      description: '',
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
            <Label>Тип ТО</Label>
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={MAINTENANCE_TYPES.map((type) => ({ value: type, label: type }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map((type) => (
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
            <Label htmlFor="impl-to-cost">Стоимость</Label>
            <Input
              id="impl-to-cost"
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
            <Label htmlFor="impl-to-desc">Описание</Label>
            <Textarea id="impl-to-desc" rows={3} {...form.register('description')} />
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
