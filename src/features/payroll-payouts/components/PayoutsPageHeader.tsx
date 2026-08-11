import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPayrollPeriod, payrollStatusLabel } from '@/features/payroll/labels'
import type { PayrollRunSummary } from '../types'

type Props = {
  runs: PayrollRunSummary[]
  runId: string | null
  onRunChange: (id: string) => void
  onAdvance?: () => void
  hideTitle?: boolean
}

export function PayoutsPageHeader({
  runs,
  runId,
  onRunChange,
  onAdvance,
  hideTitle,
}: Props) {
  const safeRuns = Array.isArray(runs) ? runs : []
  const selected = safeRuns.find((r) => r.id === runId)

  return (
    <>
      {!hideTitle || onAdvance ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          {!hideTitle ? (
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground">Выдача ЗП</h1>
              <p className="text-sm text-muted-foreground">
                Общая ведомость фактических выплат и авансов
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ведомость выдачи по подтверждённому начислению
            </p>
          )}
          {onAdvance ? (
            <Button
              variant="outline"
              className="min-h-11 w-full sm:min-h-10 sm:w-auto"
              onClick={onAdvance}
            >
              <Plus className="mr-1 size-4 shrink-0" />
              <span className="sm:hidden">Аванс вне начисления</span>
              <span className="hidden sm:inline">Зарегистрировать аванс вне начисления</span>
            </Button>
          ) : null}
        </div>
      ) : null}
      {safeRuns.length > 0 && (
        <div className="w-full max-w-xl min-w-0 space-y-1">
          <Label>Ведомость за период</Label>
          <Select
            value={runId ?? undefined}
            onValueChange={(value) => {
              if (value) onRunChange(value)
            }}
          >
            <SelectTrigger className="h-auto min-h-10 w-full py-2">
              <SelectValue placeholder="Выберите период">
                {selected
                  ? `${formatPayrollPeriod(selected.periodStart, selected.periodEnd)} · ${payrollStatusLabel(selected.status)} · ${selected.linesCount} сотр.`
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {safeRuns.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {formatPayrollPeriod(r.periodStart, r.periodEnd)} ·{' '}
                  {payrollStatusLabel(r.status)} · {r.linesCount} сотр.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )
}
