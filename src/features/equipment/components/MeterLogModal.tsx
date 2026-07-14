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
import { Textarea } from '@/components/ui/textarea'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import { useAddMeterLog } from '../hooks'
import { meterLogSchema, type MeterLogFormValues } from '../schemas'

type MeterLogModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentId: string
  meterLabel: string
}

export function MeterLogModal({
  open,
  onOpenChange,
  equipmentId,
  meterLabel,
}: MeterLogModalProps) {
  const addLog = useAddMeterLog(equipmentId)
  const form = useForm<MeterLogFormValues>({
    resolver: zodResolver(meterLogSchema),
    defaultValues: {
      value_added: undefined as unknown as number,
      date: formatApiDate(new Date()),
      note: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      value_added: undefined as unknown as number,
      date: formatApiDate(new Date()),
      note: '',
    })
  }, [form, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Внести показания</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await addLog.mutateAsync(values)
            onOpenChange(false)
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="meter-added">Добавить {meterLabel}</Label>
            <Input
              id="meter-added"
              type="number"
              step="any"
              {...form.register('value_added', {
                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
              })}
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
            <Label htmlFor="meter-note">Примечание</Label>
            <Textarea id="meter-note" rows={3} {...form.register('note')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={addLog.isPending}
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
