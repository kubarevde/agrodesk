import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { formatIsoDate } from '@/lib/dates'
import { useAddImplementUsageLog } from '../hooks'
import { usageLogSchema, type UsageLogFormValues } from '../schemas'

type ImplementUsageLogModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  implementId: string
}

export function ImplementUsageLogModal({
  open,
  onOpenChange,
  implementId,
}: ImplementUsageLogModalProps) {
  const addLog = useAddImplementUsageLog(implementId)
  const form = useForm<UsageLogFormValues>({
    resolver: zodResolver(usageLogSchema),
    defaultValues: {
      value_added: undefined as unknown as number,
      date: formatIsoDate(new Date()),
      note: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      value_added: undefined as unknown as number,
      date: formatIsoDate(new Date()),
      note: '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open only
  }, [open])

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
            <Label htmlFor="impl-usage-added">Добавить ч</Label>
            <Input
              id="impl-usage-added"
              type="number"
              step="any"
              className="min-h-11"
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
                <DatePicker
                  value={field.value}
                  onChange={(next) => {
                    if (next) field.onChange(next)
                  }}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="impl-usage-note">Примечание</Label>
            <Textarea id="impl-usage-note" rows={3} {...form.register('note')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={addLog.isPending}
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
