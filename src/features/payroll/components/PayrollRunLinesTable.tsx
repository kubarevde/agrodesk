import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney } from '@/features/payroll-payouts/format'
import { payoutStatusLabel } from '@/features/payroll-payouts/labels'
import { schemeLabel } from '../labels'
import type { PayrollRunLine } from '../types'

type Props = {
  lines: PayrollRunLine[]
  isDraft: boolean
  onAdjust: (line: PayrollRunLine) => void
  onDetail: (line: PayrollRunLine) => void
}

function LineActions({
  line,
  isDraft,
  onAdjust,
  onDetail,
}: {
  line: PayrollRunLine
  isDraft: boolean
  onAdjust: (line: PayrollRunLine) => void
  onDetail: (line: PayrollRunLine) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 sm:justify-end">
      <Button size="sm" variant="ghost" className="min-h-10 sm:min-h-7" onClick={() => onDetail(line)}>
        Детали
      </Button>
      {isDraft ? (
        <Button
          size="sm"
          variant="outline"
          className="min-h-10 sm:min-h-7"
          onClick={() => onAdjust(line)}
        >
          Корр.
        </Button>
      ) : null}
    </div>
  )
}

export function PayrollRunLinesTable({ lines, isDraft, onAdjust, onDetail }: Props) {
  const safeLines = Array.isArray(lines) ? lines : []

  return (
    <div className="min-w-0 space-y-3">
      <ul className="space-y-3 md:hidden">
        {safeLines.map((line) => (
          <li key={line.id} className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium">{line.employeeName || '—'}</p>
            <p className="text-xs text-muted-foreground">
              {line.employeeCode || '—'} · {schemeLabel(line.paymentScheme)} ·{' '}
              {payoutStatusLabel(line.payoutStatus)}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Начислено</dt>
                <dd className="tabular-nums">{formatMoney(line.totalAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Выдано</dt>
                <dd className="tabular-nums">{formatMoney(line.amountPaid)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Остаток</dt>
                <dd className="tabular-nums">{formatMoney(line.remainderAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Корр.</dt>
                <dd className="tabular-nums">{formatMoney(line.adjustmentsTotal)}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <LineActions
                line={line}
                isDraft={isDraft}
                onAdjust={onAdjust}
                onDetail={onDetail}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Схема</TableHead>
              <TableHead className="text-right">База</TableHead>
              <TableHead className="text-right">Корр.</TableHead>
              <TableHead className="text-right">Начислено</TableHead>
              <TableHead className="text-right">Выдано</TableHead>
              <TableHead className="text-right">Остаток</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeLines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <div className="font-medium">{line.employeeName || '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {line.employeeCode || '—'}
                  </div>
                </TableCell>
                <TableCell>{schemeLabel(line.paymentScheme)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(line.baseCalculatedAmount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(line.adjustmentsTotal)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(line.totalAmount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(line.amountPaid)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(line.remainderAmount)}
                </TableCell>
                <TableCell className="text-sm">
                  {payoutStatusLabel(line.payoutStatus)}
                </TableCell>
                <TableCell className="text-right">
                  <LineActions
                    line={line}
                    isDraft={isDraft}
                    onAdjust={onAdjust}
                    onDetail={onDetail}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
