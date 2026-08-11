import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import type { PayrollControlEmployeeRow } from '../../controlTypes'

type Props = {
  rows: PayrollControlEmployeeRow[]
  onOpenRun: (runId: string) => void
}

function StatusBadge({ row }: { row: PayrollControlEmployeeRow }) {
  const variant =
    row.hasOverpay || row.status === 'needs_check'
      ? 'destructive'
      : row.status === 'paid'
        ? 'default'
        : 'secondary'
  return <Badge variant={variant}>{row.statusLabel}</Badge>
}

function OpenRunButton({
  runId,
  onOpenRun,
  label = 'Открыть',
  fullWidth = false,
}: {
  runId: string | null
  onOpenRun: (id: string) => void
  label?: string
  fullWidth?: boolean
}) {
  if (!runId) return null
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={
        fullWidth
          ? 'min-h-11 w-full sm:min-h-8 sm:w-auto'
          : 'min-h-8'
      }
      onClick={() => onOpenRun(runId)}
    >
      {label}
    </Button>
  )
}

export function PayrollControlEmployees({ rows, onOpenRun }: Props) {
  return (
    <div className="min-w-0 space-y-3">
      <h3 className="text-sm font-semibold">Итоги по сотрудникам</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет сотрудников с начислениями за период</p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {rows.map((row) => (
              <li key={row.employeeId} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{row.schemesLabel}</p>
                  </div>
                  <StatusBadge row={row} />
                </div>
                <details className="group/emp mt-2">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground">
                    <ChevronDown className="size-3.5 transition-transform group-open/emp:rotate-180" />
                    Детали
                  </summary>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Начислено</dt>
                      <dd className="tabular-nums">{formatMoney(row.accrued)}</dd>
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
                      <dt className="text-muted-foreground">Авансы</dt>
                      <dd className="tabular-nums">{formatMoney(row.advances)}</dd>
                    </div>
                  </dl>
                  <div className="mt-2">
                    <OpenRunButton
                      runId={row.runId}
                      onOpenRun={onOpenRun}
                      label="Открыть начисление"
                      fullWidth
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>

          <div className="hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Схема</TableHead>
                  <TableHead className="text-right">Начислено</TableHead>
                  <TableHead className="text-right">Выдано</TableHead>
                  <TableHead className="text-right">Остаток</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.schemesLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(row.accrued)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(row.paid)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(row.remainder)}</TableCell>
                    <TableCell>
                      <StatusBadge row={row} />
                    </TableCell>
                    <TableCell className="text-right">
                      <OpenRunButton runId={row.runId} onOpenRun={onOpenRun} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
