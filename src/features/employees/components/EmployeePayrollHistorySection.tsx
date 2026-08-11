import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/features/employees/salaryUtils'
import { formatPayrollPeriod, PAYROLL_STATUS_LABELS } from '@/features/payroll/labels'
import { PAYOUT_STATUS_LABELS } from '@/features/payroll-payouts/labels'
import { usePayrollRuns } from '@/features/payroll/hooks'
import type { PayrollRun, PayrollRunLine } from '@/features/payroll/types'

type EmployeePayrollHistorySectionProps = {
  employeeId: string
  canViewMoney: boolean
  variant: 'accruals' | 'payouts'
}

type LineEntry = { run: PayrollRun; line: PayrollRunLine }

function money(value: number, canView: boolean): string {
  return canView ? formatMoney(value) : '—'
}

export function EmployeePayrollHistorySection({
  employeeId,
  canViewMoney,
  variant,
}: EmployeePayrollHistorySectionProps) {
  const navigate = useNavigate()
  const { data: runs = [], isLoading } = usePayrollRuns()

  const entries = useMemo(() => {
    const list: LineEntry[] = []
    for (const run of runs) {
      const line = run.lines.find((item) => item.employeeId === employeeId)
      if (line) list.push({ run, line })
    }
    return list.sort((a, b) => b.run.periodStart.localeCompare(a.run.periodStart))
  }, [runs, employeeId])

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title={variant === 'accruals' ? 'Начислений нет' : 'Выдач нет'}
        description={
          variant === 'accruals'
            ? 'Когда появится ведомость с этим сотрудником, она отобразится здесь'
            : 'История выплат по строкам начислений появится после выдачи'
        }
      />
    )
  }

  return (
    <ul className="min-w-0 space-y-2">
      {entries.map(({ run, line }) => (
        <li
          key={line.id}
          className="rounded-lg border border-border bg-surface px-3 py-3 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">
                {formatPayrollPeriod(run.periodStart, run.periodEnd)}
              </p>
              {variant === 'accruals' ? (
                <p className="text-muted-foreground">
                  Начислено: {money(line.totalAmount, canViewMoney)} · Выдано:{' '}
                  {money(line.amountPaid, canViewMoney)} · Остаток:{' '}
                  {money(line.remainderAmount, canViewMoney)}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Итого: {money(line.totalAmount, canViewMoney)} · Выдано:{' '}
                  {money(line.amountPaid, canViewMoney)} · Остаток:{' '}
                  {money(line.remainderAmount, canViewMoney)}
                </p>
              )}
            </div>
            <Badge variant="outline">
              {variant === 'accruals'
                ? (PAYROLL_STATUS_LABELS[run.status] ?? '—')
                : (PAYOUT_STATUS_LABELS[line.payoutStatus] ?? '—')}
            </Badge>
          </div>
          {variant === 'accruals' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 min-h-10"
              onClick={() =>
                void navigate({
                  to: '/employees',
                  search: { tab: 'salary', payroll: 'accruals', runId: run.id },
                })
              }
            >
              Открыть начисление
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
