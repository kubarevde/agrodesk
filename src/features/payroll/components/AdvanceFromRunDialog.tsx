import { useMemo } from 'react'
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
import { formatMoney } from '@/features/payroll-payouts/format'
import { PAYOUT_METHOD_LABELS } from '@/features/payroll-payouts/labels'
import type { PayoutMethod } from '@/features/payroll-payouts/types'
import type { PayrollRunLine } from '../types'

const schema = z
  .object({
    employeeId: z.string().min(1, 'Выберите сотрудника'),
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

type FormValues = z.infer<typeof schema>

export type RunAdvancePayload = {
  employeeId: string
  amountPaid: number
  payoutMethod: PayoutMethod
  payoutDate: string
  comment?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lines: PayrollRunLine[]
  submitting: boolean
  onSubmit: (payload: RunAdvancePayload) => void
}

export function AdvanceFromRunDialog({
  open,
  onOpenChange,
  lines,
  submitting,
  onSubmit,
}: Props) {
  const employees = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; code: string; accrued: number; paid: number }
    >()
    for (const line of lines) {
      const row = map.get(line.employeeId) ?? {
        id: line.employeeId,
        name: line.employeeName || 'Сотрудник недоступен',
        code: line.employeeCode || '—',
        accrued: 0,
        paid: 0,
      }
      row.accrued += line.totalAmount
      row.paid += line.amountPaid
      map.set(line.employeeId, row)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [lines])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      employeeId: '',
      amountPaid: undefined,
      payoutMethod: 'cash',
      payoutDate: new Date().toISOString().slice(0, 10),
      comment: '',
    },
  })

  const employeeId = form.watch('employeeId')
  const method = form.watch('payoutMethod')
  const amount = Number(form.watch('amountPaid') || 0)
  const selected = employees.find((e) => e.id === employeeId)
  const remainder = selected ? Math.max(selected.accrued - selected.paid, 0) : 0
  const after = selected ? Math.max(remainder - (Number.isFinite(amount) ? amount : 0), 0) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Выдать аванс</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Аванс — уже выданная часть зарплаты. Он не меняет начисленную сумму, а уменьшает
          остаток к выдаче.
        </p>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => {
            if (values.amountPaid > remainder + 1e-9) {
              form.setError('amountPaid', {
                message: 'Сумма аванса превышает текущий остаток по начислению сотрудника',
              })
              return
            }
            onSubmit({
              employeeId: values.employeeId,
              amountPaid: values.amountPaid,
              payoutMethod: values.payoutMethod as PayoutMethod,
              payoutDate: values.payoutDate,
              comment: values.comment?.trim() || undefined,
            })
          })}
        >
          <div className="space-y-1">
            <Label>Сотрудник</Label>
            <Select
              value={employeeId || undefined}
              onValueChange={(v) => {
                if (v) form.setValue('employeeId', v)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите сотрудника">
                  {selected ? `${selected.name} (${selected.code})` : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Сумма аванса, ₽</Label>
            <Input type="number" step="0.01" {...form.register('amountPaid')} />
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
                <SelectValue>{PAYOUT_METHOD_LABELS[method]}</SelectValue>
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
            <Label>Комментарий</Label>
            <Textarea rows={2} {...form.register('comment')} />
          </div>
          {selected ? (
            <dl className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt>Начислено на текущий момент</dt>
                <dd className="tabular-nums">{formatMoney(selected.accrued)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Уже выдано</dt>
                <dd className="tabular-nums">{formatMoney(selected.paid)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Остаток после выдачи аванса</dt>
                <dd className="tabular-nums">{formatMoney(after)}</dd>
              </div>
            </dl>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting || !selected}>
              Выдать аванс
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
