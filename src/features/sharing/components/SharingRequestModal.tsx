import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import { useCreateSharingRequest } from '../hooks'

const schema = z.object({
  message: z.string().optional(),
  desiredFrom: z.string().optional(),
  desiredTo: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type SharingRequestModalProps = {
  open: boolean
  listingId: string
  listingTitle: string
  onClose: () => void
}

export function SharingRequestModal({
  open,
  listingId,
  listingTitle,
  onClose,
}: SharingRequestModalProps) {
  const createRequest = useCreateSharingRequest()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: '', desiredFrom: '', desiredTo: '' },
  })

  useEffect(() => {
    if (open) form.reset({ message: '', desiredFrom: '', desiredTo: '' })
  }, [form, open])

  const pending = form.formState.isSubmitting || createRequest.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Заявка: {listingTitle}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await createRequest.mutateAsync({
              listingId,
              message: values.message || undefined,
              desiredFrom: values.desiredFrom || undefined,
              desiredTo: values.desiredTo || undefined,
            })
            onClose()
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="message">Сообщение владельцу</Label>
            <Textarea
              id="message"
              placeholder="Необязательно"
              rows={3}
              {...form.register('message')}
            />
          </div>

          <DateField
            control={form.control}
            name="desiredFrom"
            label="Желаемая дата начала"
          />
          <DateField
            control={form.control}
            name="desiredTo"
            label="Желаемая дата окончания"
          />

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Отправить заявку
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DateField({
  control,
  name,
  label,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control']
  name: 'desiredFrom' | 'desiredTo'
  label: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              className="inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input px-3 text-sm"
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              {field.value
                ? format(parseApiDate(field.value), 'dd MMMM yyyy', { locale: ru })
                : 'Необязательно'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={ru}
                selected={field.value ? parseApiDate(field.value) : undefined}
                onSelect={(date) => {
                  field.onChange(date ? formatApiDate(date) : '')
                  setOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        )}
      />
    </div>
  )
}
