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
import type { CreateAdvancePayload, PayoutMethod } from '../types'

const schema = z.object({
  employeeId: z.string().min(1, 'Выберите сотрудника'),
  amountPaid: z.coerce.number().positive('Укажите сумму больше 0'),
  payoutMethod: z.enum(['cash', 'bank_transfer', 'card', 'other']),
  payoutDate: z.string().min(1),
  comment: z.string().min(1, 'Комментарий обязателен для аванса'),
})

type FormValues = z.infer<typeof schema>

type EmployeeOpt = { id: string; fullName: string; employeeCode: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeOpt[]
  submitting: boolean
  onSubmit: (payload: CreateAdvancePayload) => void
}

export function AdvanceFormDialog({
  open,
  onOpenChange,
  employees,
  submitting,
  onSubmit,
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<z.infer<typeof schema>>,
    defaultValues: {
      employeeId: '',
      amountPaid: undefined,
      payoutMethod: 'cash',
      payoutDate: new Date().toISOString().slice(0, 10),
      comment: '',
    },
  })

  const method = form.watch('payoutMethod')
  const employeeId = form.watch('employeeId')
  const selectedEmployee = employees.find((e) => e.id === employeeId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Зарегистрировать аванс вне начисления</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Исключение: деньги уже выданы до создания расчётного периода. Позже привяжите аванс к
          строке начисления.
        </p>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) =>
            onSubmit({
              employeeId: values.employeeId,
              amountPaid: values.amountPaid,
              payoutMethod: values.payoutMethod as PayoutMethod,
              payoutDate: values.payoutDate,
              comment: values.comment.trim(),
            }),
          )}
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
                  {selectedEmployee
                    ? `${selectedEmployee.fullName} (${selectedEmployee.employeeCode})`
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName} ({e.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.employeeId && (
              <p className="text-sm text-destructive">{form.formState.errors.employeeId.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Сумма аванса, ₽</Label>
            <Input type="number" step="0.01" {...form.register('amountPaid')} />
          </div>
          <div className="space-y-1">
            <Label>Способ выдачи</Label>
            <Select
              value={method}
              onValueChange={(v) => form.setValue('payoutMethod', v as PayoutMethod)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Способ">{PAYOUT_METHOD_LABELS[method]}</SelectValue>
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
            <Label>Комментарий (период / назначение)</Label>
            <Textarea rows={2} {...form.register('comment')} />
            {form.formState.errors.comment && (
              <p className="text-sm text-destructive">{form.formState.errors.comment.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting}>
              Зарегистрировать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
