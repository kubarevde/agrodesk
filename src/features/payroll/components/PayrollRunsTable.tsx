import { formatMoney } from '@/features/payroll-payouts/format'
import { formatPayrollPeriod, payrollStatusLabel } from '../labels'
import type { PayrollRun } from '../types'
import { PayrollRunRowActions } from './PayrollRunRowActions'
import { formatDateTime } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Props = {
  runs: PayrollRun[]
  canConfirm: boolean
  onOpen: (id: string) => void
}

export function PayrollRunsTable({ runs, canConfirm, onOpen }: Props) {
  return (
    <div className="min-w-0 space-y-3">
      <ul className="space-y-3 md:hidden">
        {runs.map((run) => (
          <li key={run.id}>
            <button
              type="button"
              className="w-full rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-muted/40"
              onClick={() => onOpen(run.id)}
            >
              <p className="font-medium text-foreground">
                {formatPayrollPeriod(run.periodStart, run.periodEnd)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {payrollStatusLabel(run.status)} · создан {formatDateTime(run.createdAt)}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Сотр.</dt>
                  <dd className="tabular-nums">{run.linesCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Начислено</dt>
                  <dd className="tabular-nums">{formatMoney(run.totalAmount)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Выдано</dt>
                  <dd className="tabular-nums">{formatMoney(run.totalPaid)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Остаток</dt>
                  <dd className="tabular-nums">{formatMoney(run.remainderAmount)}</dd>
                </div>
              </dl>
            </button>
            <div className="mt-2 px-1" onClick={(e) => e.stopPropagation()}>
              <PayrollRunRowActions run={run} canConfirm={canConfirm} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Период</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Сотр.</TableHead>
              <TableHead className="text-right">Начислено</TableHead>
              <TableHead className="text-right">Выдано</TableHead>
              <TableHead className="text-right">Остаток</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow
                key={run.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => onOpen(run.id)}
              >
                <TableCell>
                  <div className="font-medium text-foreground">
                    {formatPayrollPeriod(run.periodStart, run.periodEnd)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    создан {formatDateTime(run.createdAt)}
                  </div>
                </TableCell>
                <TableCell>{payrollStatusLabel(run.status)}</TableCell>
                <TableCell className="text-right tabular-nums">{run.linesCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(run.totalAmount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(run.totalPaid)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(run.remainderAmount)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <PayrollRunRowActions run={run} canConfirm={canConfirm} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
