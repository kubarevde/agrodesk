import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMoney } from '../format'
import { payoutMethodLabel } from '../labels'
import type { PayrollPayout, PayoutSheetLine } from '../types'
import { schemeLabel } from '@/features/payroll/labels'
import { formatDate } from '@/lib/format'

type Props = {
  advances: PayrollPayout[]
  lines: PayoutSheetLine[]
  linking: boolean
  onLink: (payoutId: string, lineId: string) => void
}

export function UnlinkedAdvancesBanner({ advances, lines, linking, onLink }: Props) {
  const [active, setActive] = useState<PayrollPayout | null>(null)
  const [lineId, setLineId] = useState('')

  const safeAdvances = Array.isArray(advances) ? advances : []
  const safeLines = Array.isArray(lines) ? lines : []

  const matchingLines = active
    ? safeLines.filter((l) => l.employeeId === active.employeeId)
    : []

  const selected = useMemo(
    () => matchingLines.find((l) => l.lineId === lineId) ?? null,
    [matchingLines, lineId],
  )

  const preview = active && selected
    ? {
        accrued: selected.totalAmount,
        paidAfter: selected.amountPaid + active.amountPaid,
        remainderAfter: Math.max(
          selected.totalAmount - (selected.amountPaid + active.amountPaid),
          0,
        ),
      }
    : null

  if (safeAdvances.length === 0) return null

  return (
    <>
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-foreground">
          Несвязанные авансы ({safeAdvances.length}) — привяжите к строке начисления
        </p>
        <ul className="space-y-2">
          {safeAdvances.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>
                {a.employeeName || '—'}: {formatMoney(a.amountPaid)} от{' '}
                {formatDate(a.payoutDate)} · {payoutMethodLabel(a.payoutMethod)}
                {a.comment ? ` — ${a.comment}` : ''}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="min-h-10 sm:min-h-7"
                onClick={() => {
                  setActive(a)
                  setLineId('')
                }}
              >
                Привязать
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Привязка аванса</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Аванс будет учтён как уже выданная часть зарплаты. Сумма начисления не изменится.
          </p>
          {active ? (
            <dl className="grid gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Сотрудник</dt>
                <dd>{active.employeeName || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Сумма аванса</dt>
                <dd>{formatMoney(active.amountPaid)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Способ</dt>
                <dd>{payoutMethodLabel(active.payoutMethod)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Дата</dt>
                <dd>{formatDate(active.payoutDate)}</dd>
              </div>
            </dl>
          ) : null}
          <div className="space-y-1">
            <Label>Строка начисления</Label>
            <Select
              value={lineId}
              onValueChange={(value) => {
                if (value) setLineId(value)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите строку">
                  {selected
                    ? `${schemeLabel(selected.paymentScheme)}: начислено ${formatMoney(selected.totalAmount)}, остаток ${formatMoney(selected.remainderAmount)}`
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {matchingLines.map((l) => (
                  <SelectItem key={l.lineId} value={l.lineId}>
                    {schemeLabel(l.paymentScheme)}: начислено {formatMoney(l.totalAmount)}, остаток{' '}
                    {formatMoney(l.remainderAmount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {matchingLines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Нет строк этого сотрудника в выбранном начислении
              </p>
            )}
          </div>
          {preview ? (
            <dl className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt>Начислено (не изменится)</dt>
                <dd>{formatMoney(preview.accrued)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Выдано после привязки</dt>
                <dd>{formatMoney(preview.paidAfter)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Остаток после привязки</dt>
                <dd>{formatMoney(preview.remainderAfter)}</dd>
              </div>
            </dl>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>
              Отмена
            </Button>
            <Button
              disabled={!lineId || !active || linking}
              onClick={() => {
                if (!active || !lineId) return
                onLink(active.id, lineId)
                setActive(null)
              }}
            >
              Привязать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
