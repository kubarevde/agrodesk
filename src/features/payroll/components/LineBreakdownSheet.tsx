import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMoney } from '@/features/payroll-payouts/format'
import { formatDate } from '@/lib/format'
import { adjustmentTypeLabel, schemeLabel } from '../labels'
import type { PayrollRunLine } from '../types'

type Props = {
  line: PayrollRunLine
  open: boolean
  onOpenChange: (open: boolean) => void
}

function numOrDash(value: unknown): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isFinite(n)) return formatMoney(n)
  return String(value)
}

function BreakdownBody({ line }: { line: PayrollRunLine }) {
  const b = line.sourceBreakdown && typeof line.sourceBreakdown === 'object'
    ? line.sourceBreakdown
    : {}
  const adjustments = Array.isArray(line.adjustments) ? line.adjustments : []

  return (
    <div className="min-w-0 space-y-3 text-sm">
      <p>
        <span className="text-muted-foreground">Схема: </span>
        {schemeLabel(line.paymentScheme)}
      </p>
      <p>
        <span className="text-muted-foreground">База: </span>
        {formatMoney(line.baseCalculatedAmount)}
      </p>

      {line.paymentScheme === 'hourly' && (
        <ul className="list-inside list-disc text-muted-foreground">
          <li>Часы: {String(b.hours ?? b.total_hours ?? '—')}</li>
          <li>Ставка: {numOrDash(b.rate)}</li>
          <li>Сверхурочные: {String(b.overtime_hours ?? b.overtimeHours ?? '—')}</li>
        </ul>
      )}
      {line.paymentScheme === 'per_shift' && (
        <p className="text-muted-foreground">
          Смен: {String(b.shifts_count ?? b.shift_count ?? '—')}, ставка за смену:{' '}
          {numOrDash(b.rate)}
        </p>
      )}
      {line.paymentScheme === 'monthly' && (
        <ul className="list-inside list-disc text-muted-foreground">
          <li>Оклад: {numOrDash(b.rate ?? b.monthly_rate)}</li>
          <li>
            Период схемы:{' '}
            {b.valid_from || b.segment_start
              ? `${formatDate(String(b.valid_from ?? b.segment_start))} — ${formatDate(String(b.valid_to ?? b.segment_end ?? ''))}`
              : '—'}
          </li>
        </ul>
      )}
      {line.paymentScheme === 'piecework' && (
        <p className="text-muted-foreground">
          Выработка: {String(b.piecework_count ?? b.quantity ?? '—')}{' '}
          {String(b.unit ?? b.piecework_unit ?? '')}, расценка {numOrDash(b.rate)}
        </p>
      )}

      {adjustments.length > 0 && (
        <div>
          <p className="mb-1 font-medium">Корректировки</p>
          <ul className="space-y-1">
            {adjustments.map((a) => (
              <li key={a.id}>
                {adjustmentTypeLabel(a.type)}: {a.sign > 0 ? '+' : '−'}
                {formatMoney(a.amount)}
                {a.comment ? ` — ${a.comment}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function LineBreakdownSheet({ line, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {line.employeeName || '—'} · {schemeLabel(line.paymentScheme)}
          </DialogTitle>
        </DialogHeader>
        <BreakdownBody line={line} />
      </DialogContent>
    </Dialog>
  )
}
