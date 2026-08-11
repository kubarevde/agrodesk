import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatMoney } from '@/features/payroll-payouts/format'
import { UnlinkedAdvancesBanner } from '@/features/payroll-payouts/components/UnlinkedAdvancesBanner'
import { useLinkAdvance } from '@/features/payroll-payouts/hooks'
import { formatPayrollPeriod, payrollStatusLabel } from '../labels'
import { useCreateRunAdvance, usePayrollRun } from '../hooks'
import type { PayrollRunLine } from '../types'
import { AdjustmentDialog } from './AdjustmentDialog'
import { AdvanceFromRunDialog } from './AdvanceFromRunDialog'
import { LineBreakdownSheet } from './LineBreakdownSheet'
import { PayrollRunActions } from './PayrollRunActions'
import { PayrollRunLinesTable } from './PayrollRunLinesTable'
import { Users } from 'lucide-react'

type Props = {
  runId: string
  canConfirm: boolean
  canPay: boolean
  onBack: () => void
}

export function PayrollRunDetail({ runId, canConfirm, canPay, onBack }: Props) {
  const navigate = useNavigate()
  const { data: run, isLoading, isError, refetch } = usePayrollRun(runId)
  const linkAdvance = useLinkAdvance(runId)
  const createAdvance = useCreateRunAdvance(runId)
  const [adjLine, setAdjLine] = useState<PayrollRunLine | null>(null)
  const [detailLine, setDetailLine] = useState<PayrollRunLine | null>(null)
  const [advanceOpen, setAdvanceOpen] = useState(false)

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (isError || !run) {
    return (
      <EmptyState
        icon={Users}
        title="Начисление не загружено"
        description="Запись могла быть удалена, или нет доступа. Вернитесь к списку или повторите запрос."
        action={{ label: 'Повторить', onClick: () => void refetch() }}
      />
    )
  }

  const baseTotal = run.lines.reduce((s, l) => s + l.baseCalculatedAmount, 0)
  const adjTotal = run.lines.reduce((s, l) => s + l.adjustmentsTotal, 0)
  const advanceTotal = run.lines.reduce((s, l) => s + l.amountAdvance, 0)
  const isDraft = run.status === 'draft'

  return (
    <TooltipProvider>
      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full justify-start sm:min-h-8 sm:w-auto"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            К списку
          </Button>
          <h2 className="min-w-0 text-lg font-semibold break-words">
            {formatPayrollPeriod(run.periodStart, run.periodEnd)}
          </h2>
          <span className="w-fit rounded-md bg-muted px-2 py-0.5 text-xs">
            {payrollStatusLabel(run.status)}
          </span>
        </div>

        {run.paidExceedsAccrued ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            По сотруднику уже выдано больше, чем начислено после пересчёта. Проверьте смены,
            ставки, корректировки и ранее выданные суммы. Подтверждение заблокировано, пока
            превышение не устранено.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Базовое начисление</p>
            <p className="text-lg font-semibold">{formatMoney(baseTotal)}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Корректировки</p>
            <p className="text-lg font-semibold">{formatMoney(adjTotal)}</p>
            <p className="text-xs text-muted-foreground">Премии, штрафы, удержания</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Начислено</p>
            <p className="text-lg font-semibold">{formatMoney(run.totalAmount)}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Авансы</p>
            <p className="text-lg font-semibold">{formatMoney(advanceTotal)}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Всего выдано</p>
            <p className="text-lg font-semibold">{formatMoney(run.totalPaid)}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Остаток к выдаче</p>
            <p className="text-lg font-semibold">{formatMoney(run.remainderAmount)}</p>
          </div>
        </div>

        {(run.status === 'confirmed' || run.status === 'paid') && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:min-h-8 sm:w-auto"
            onClick={() =>
              void navigate({
                to: '/expenses',
                search: {
                  tab: 'expenses',
                  category: 'salary',
                  from: run.periodStart,
                  to: run.periodEnd,
                },
              })
            }
          >
            Затраты
          </Button>
        )}

        {run.unlinkedAdvances.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Авансы, ожидающие привязки</p>
            <p className="text-xs text-muted-foreground">
              Аванс — уже выданная часть зарплаты. Он не меняет начисленную сумму, а уменьшает
              остаток к выдаче.
            </p>
            <UnlinkedAdvancesBanner
              advances={run.unlinkedAdvances}
              lines={run.lines.map((l) => ({
                lineId: l.id,
                employeeId: l.employeeId,
                employeeName: l.employeeName,
                employeeCode: l.employeeCode,
                paymentScheme: l.paymentScheme,
                totalAmount: l.totalAmount,
                amountPaid: l.amountPaid,
                remainderAmount: l.remainderAmount,
                payoutStatus: l.payoutStatus,
                remainderClosed: l.remainderClosed,
                remainderCloseComment: l.remainderCloseComment,
                payouts: [],
              }))}
              linking={linkAdvance.isPending}
              onLink={(payoutId, lineId) => linkAdvance.mutate({ payoutId, lineId })}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <PayrollRunActions
            run={run}
            canConfirm={canConfirm && !run.paidExceedsAccrued}
          />
          {isDraft &&
            (canPay ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:min-h-8 sm:w-auto"
                onClick={() => setAdvanceOpen(true)}
              >
                Выдать аванс
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:min-h-8 sm:w-auto"
                disabled
                title="У вас нет права фиксировать выдачу зарплаты"
              >
                Выдать аванс
              </Button>
            ))}
        </div>

        <PayrollRunLinesTable
          lines={run.lines}
          isDraft={isDraft}
          onAdjust={setAdjLine}
          onDetail={setDetailLine}
        />

        {adjLine && (
          <AdjustmentDialog
            open
            line={adjLine}
            runId={runId}
            onOpenChange={(o) => !o && setAdjLine(null)}
          />
        )}
        {detailLine && (
          <LineBreakdownSheet
            line={detailLine}
            open
            onOpenChange={(o) => !o && setDetailLine(null)}
          />
        )}
        <AdvanceFromRunDialog
          open={advanceOpen}
          onOpenChange={setAdvanceOpen}
          lines={run.lines}
          submitting={createAdvance.isPending}
          onSubmit={(payload) =>
            createAdvance.mutate(payload, { onSuccess: () => setAdvanceOpen(false) })
          }
        />
      </div>
    </TooltipProvider>
  )
}
