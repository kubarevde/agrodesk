import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
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
import { useCreateAdjustment } from '../hooks'
import { ADJUSTMENT_TYPE_LABELS, type AdjustmentType, type PayrollRunLine } from '../types'

const schema = z
  .object({
    type: z.enum(['bonus', 'penalty', 'deduction', 'other']),
    amount: z.coerce.number().min(0),
    sign: z.enum(['1', '-1']).optional(),
    comment: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'other') {
      if (!v.sign) {
        ctx.addIssue({ code: 'custom', path: ['sign'], message: 'Укажите знак' })
      }
      if (!v.comment?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['comment'], message: 'Комментарий обязателен' })
      }
    }
  })

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  line: PayrollRunLine
  runId: string
  onOpenChange: (open: boolean) => void
}

export function AdjustmentDialog({ open, line, runId, onOpenChange }: Props) {
  const create = useCreateAdjustment(runId)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { type: 'bonus', amount: 0, comment: '' },
  })
  const type = form.watch('type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Корректировка: {line.employeeName}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => {
            create.mutate(
              {
                lineId: line.id,
                type: values.type as AdjustmentType,
                amount: values.amount,
                sign: values.type === 'other' ? (Number(values.sign) as 1 | -1) : undefined,
                comment: values.comment?.trim(),
              },
              { onSuccess: () => onOpenChange(false) },
            )
          })}
        >
          <div className="space-y-1">
            <Label>Тип</Label>
            <Select
              value={type}
              onValueChange={(v) => form.setValue('type', v as FormValues['type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ADJUSTMENT_TYPE_LABELS) as AdjustmentType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {ADJUSTMENT_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Аванс оформляется только во вкладке «Выдача ЗП», не как корректировка.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Сумма</Label>
            <Input type="number" step="0.01" {...form.register('amount')} />
          </div>
          {type === 'other' && (
            <>
              <div className="space-y-1">
                <Label>Знак</Label>
                <Select
                  value={form.watch('sign')}
                  onValueChange={(v) => form.setValue('sign', v as '1' | '-1')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="+" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Начисление (+)</SelectItem>
                    <SelectItem value="-1">Удержание (−)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Комментарий</Label>
                <Textarea rows={2} {...form.register('comment')} />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
