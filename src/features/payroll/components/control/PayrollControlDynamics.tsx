import { format, isValid, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney } from '@/features/payroll-payouts/format'
import type { PayrollControlDynamicsRow } from '../../controlTypes'

type Props = {
  rows: PayrollControlDynamicsRow[]
  onOpenMonth?: (row: PayrollControlDynamicsRow) => void
}

function monthLabel(month: string): string {
  const d = parseISO(`${month}-01`)
  if (!isValid(d)) return month
  return format(d, 'LLLL yyyy', { locale: ru })
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  const problem =
    status === 'has_discrepancy' ||
    status === 'multiple_issues' ||
    status === 'overpaid' ||
    status === 'missing_expense' ||
    status === 'unpaid_confirmed' ||
    status === 'unlinked_advances' ||
    status === 'orphan_salary_expense' ||
    status === 'inconsistent' ||
    status === 'needs_payout'
  const variant = problem ? 'destructive' : status === 'paid' ? 'default' : 'secondary'
  return <Badge variant={variant}>{label}</Badge>
}

export function PayrollControlDynamics({ rows, onOpenMonth }: Props) {
  const safeRows = Array.isArray(rows) ? rows : []
  if (safeRows.length === 0) {
    return <p className="text-sm text-muted-foreground">Нет данных по месяцам за период</p>
  }

  return (
    <div className="min-w-0 space-y-3">
      <h3 className="text-sm font-semibold">Динамика фонда оплаты труда</h3>
      <ul className="space-y-3 md:hidden">
        {safeRows.map((row) => (
          <li key={row.month} className="rounded-lg border border-border bg-surface p-3">
            <button
              type="button"
              className="min-h-11 w-full text-left"
              onClick={() => onOpenMonth?.(row)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium capitalize">{monthLabel(row.month)}</p>
                <StatusBadge label={row.statusLabel} status={row.status} />
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Начислено</dt>
                  <dd className="tabular-nums">{formatMoney(row.accrued)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">В расходах</dt>
                  <dd className="tabular-nums">{formatMoney(row.expensesPosted)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Выдано</dt>
                  <dd className="tabular-nums">{formatMoney(row.paid)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Остаток</dt>
                  <dd className="tabular-nums">{formatMoney(row.remainder)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Сотрудников</dt>
                  <dd className="tabular-nums">{row.employeesCount}</dd>
                </div>
              </dl>
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Месяц</TableHead>
              <TableHead className="text-right">Начислено</TableHead>
              <TableHead className="text-right">В расходах</TableHead>
              <TableHead className="text-right">Выдано</TableHead>
              <TableHead className="text-right">Остаток</TableHead>
              <TableHead className="text-right">Сотр.</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeRows.map((row) => (
              <TableRow
                key={row.month}
                className={onOpenMonth ? 'cursor-pointer hover:bg-muted/40' : undefined}
                onClick={() => onOpenMonth?.(row)}
              >
                <TableCell className="capitalize font-medium">{monthLabel(row.month)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.accrued)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(row.expensesPosted)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.paid)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.remainder)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.employeesCount}</TableCell>
                <TableCell>
                  <StatusBadge label={row.statusLabel} status={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
