import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { formatMoney } from '../format'
import { payoutKindLabel, payoutMethodLabel, payoutStatusLabel } from '../labels'
import type { PayoutSheetLine } from '../types'

type Props = {
  lines: PayoutSheetLine[]
  onPay?: (line: PayoutSheetLine) => void
  onCloseRemainder?: (line: PayoutSheetLine) => void
}

function Actions({
  line,
  onPay,
  onCloseRemainder,
}: {
  line: PayoutSheetLine
  onPay?: (line: PayoutSheetLine) => void
  onCloseRemainder?: (line: PayoutSheetLine) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      {onPay && !line.remainderClosed && line.payoutStatus !== 'paid' ? (
        <Button size="sm" variant="outline" className="min-h-10 sm:min-h-7" onClick={() => onPay(line)}>
          Зафиксировать выплату
        </Button>
      ) : null}
      {onCloseRemainder &&
      line.payoutStatus === 'partially_paid' &&
      !line.remainderClosed ? (
        <Button
          size="sm"
          variant="ghost"
          className="min-h-10 sm:min-h-7"
          onClick={() => onCloseRemainder(line)}
        >
          Закрыть остаток
        </Button>
      ) : null}
    </div>
  )
}

function PayoutHistory({ line }: { line: PayoutSheetLine }) {
  const payouts = Array.isArray(line.payouts) ? line.payouts : []
  if (payouts.length === 0) return null
  const advances = payouts
    .filter((p) => p.payoutKind === 'advance')
    .reduce((s, p) => s + p.amountPaid, 0)
  return (
    <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
      <p>
        Авансы: {formatMoney(advances)} · Выплаты:{' '}
        {formatMoney(line.amountPaid - advances)}
      </p>
      <ul className="space-y-1">
        {payouts.map((p) => (
          <li key={p.id}>
            {formatDate(p.payoutDate)} · {payoutKindLabel(p.payoutKind)} ·{' '}
            {formatMoney(p.amountPaid)} · {payoutMethodLabel(p.payoutMethod)}
            {p.comment ? ` — ${p.comment}` : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PayoutSheetTable({ lines, onPay, onCloseRemainder }: Props) {
  const safeLines = Array.isArray(lines) ? lines : []
  const showActions = Boolean(onPay || onCloseRemainder)

  if (safeLines.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
        Нет начислений для выдачи
      </p>
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      <ul className="space-y-3 md:hidden">
        {safeLines.map((line) => {
          const advances = (line.payouts ?? [])
            .filter((p) => p.payoutKind === 'advance')
            .reduce((s, p) => s + p.amountPaid, 0)
          return (
            <li key={line.lineId} className="rounded-lg border border-border bg-surface p-3">
              <p className="font-medium">{line.employeeName || '—'}</p>
              <p className="text-xs text-muted-foreground">
                {line.employeeCode || '—'} · {payoutStatusLabel(line.payoutStatus)}
                {line.remainderClosed ? ' · закрыт с остатком' : ''}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Начислено</dt>
                  <dd className="tabular-nums">{formatMoney(line.totalAmount)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Авансы</dt>
                  <dd className="tabular-nums">{formatMoney(advances)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Выдано всего</dt>
                  <dd className="tabular-nums">{formatMoney(line.amountPaid)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Остаток</dt>
                  <dd className="tabular-nums">{formatMoney(line.remainderAmount)}</dd>
                </div>
              </dl>
              <PayoutHistory line={line} />
              {showActions ? (
                <div className="mt-3">
                  <Actions line={line} onPay={onPay} onCloseRemainder={onCloseRemainder} />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div className="hidden min-w-0 overflow-x-auto rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead>
              <TableHead className="text-right">Начислено</TableHead>
              <TableHead className="text-right">Авансы</TableHead>
              <TableHead className="text-right">Выдано</TableHead>
              <TableHead className="text-right">Остаток</TableHead>
              <TableHead>Статус</TableHead>
              {showActions ? <TableHead className="text-right">Действия</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeLines.map((line) => {
              const advances = (line.payouts ?? [])
                .filter((p) => p.payoutKind === 'advance')
                .reduce((s, p) => s + p.amountPaid, 0)
              return (
                <TableRow key={line.lineId}>
                  <TableCell>
                    <div className="font-medium text-foreground">{line.employeeName || '—'}</div>
                    <div className="text-xs text-muted-foreground">{line.employeeCode || '—'}</div>
                    <PayoutHistory line={line} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(line.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(advances)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(line.amountPaid)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(line.remainderAmount)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{payoutStatusLabel(line.payoutStatus)}</span>
                    {line.remainderClosed ? (
                      <div className="text-xs text-muted-foreground">закрыт с остатком</div>
                    ) : null}
                  </TableCell>
                  {showActions ? (
                    <TableCell className="text-right">
                      <Actions line={line} onPay={onPay} onCloseRemainder={onCloseRemainder} />
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
