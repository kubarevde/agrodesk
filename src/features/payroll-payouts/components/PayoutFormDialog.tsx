import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PAYOUT_METHOD_LABELS } from '../labels'
import { formatMoney } from '../format'
import type { CreatePayoutPayload, PayoutMethod } from '../types'

const schema = z
  .object({
    amountPaid: z.coerce.number().positive('Укажите сумму больше 0'),
    payoutMethod: z.enum(['cash', 'bank_transfer', 'card', 'other']),
    payoutDate: z.string().min(1, 'Укажите дату'),
    comment: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.payoutMethod === 'other' && !(val.comment && val.comment.trim())) {
      ctx.addIssue({
        code: 'custom',
        path: ['comment'],
        message: 'Для «другое» комментарий обязателен',
      })
    }
  })

function buildSchema(maxAmount: number) {
  return schema.superRefine((val, ctx) => {
    if (val.amountPaid > maxAmount + 1e-9) {
      ctx.addIssue({
        code: 'custom',
        path: ['amountPaid'],
        message: 'Сумма выдачи превышает остаток по начислению',
      })
    }
  })
}
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  remainder: number
  submitting: boolean
  onSubmit: (payload: CreatePayoutPayload) => void
}

export function PayoutFormDialog({
  open,
  onOpenChange,
  employeeName,
  remainder,
  submitting,
  onSubmit,
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(remainder)) as Resolver<FormValues>,
    defaultValues: {
      amountPaid: remainder > 0 ? remainder : undefined,
      payoutMethod: 'cash',
      payoutDate: new Date().toISOString().slice(0, 10),
      comment: '',
    },
  })

  const method = form.watch('payoutMethod')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Выдача: {employeeName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Остаток к выдаче:{' '}
          <span className="font-medium text-foreground">{formatMoney(remainder)}</span>
        </p>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) =>
            onSubmit({
              amountPaid: values.amountPaid,
              payoutMethod: values.payoutMethod as PayoutMethod,
              payoutDate: values.payoutDate,
              comment: values.comment?.trim() || undefined,
            }),
          )}
        >
          <div className="space-y-1">
            <Label htmlFor="amount">Сумма</Label>
            <Input id="amount" type="number" step="0.01" {...form.register('amountPaid')} />
            {form.formState.errors.amountPaid && (
              <p className="text-sm text-destructive">{form.formState.errors.amountPaid.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Способ выдачи</Label>
            <Select
              value={method}
              onValueChange={(v) => form.setValue('payoutMethod', v as PayoutMethod)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите способ">
                  {PAYOUT_METHOD_LABELS[method]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYOUT_METHOD_LABELS) as PayoutMethod[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PAYOUT_METHOD_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Дата выдачи</Label>
            <DatePicker
              value={form.watch('payoutDate')}
              onChange={(v) => form.setValue('payoutDate', v ?? '', { shouldValidate: true })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea id="comment" rows={2} {...form.register('comment')} />
            {form.formState.errors.comment && (
              <p className="text-sm text-destructive">{form.formState.errors.comment.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting}>
              Зафиксировать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
