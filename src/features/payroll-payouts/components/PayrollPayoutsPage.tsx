import { useMemo, useState } from 'react'
import { Banknote } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmployees } from '@/features/employees/hooks'
import {
  useCloseRemainder,
  useCreateAdvance,
  useCreateLinePayout,
  useLinkAdvance,
  usePayrollRunsForPayout,
  usePayoutSheet,
  useUnlinkedAdvances,
} from '../hooks'
import type { PayoutSheetLine } from '../types'
import { AdvanceFormDialog } from './AdvanceFormDialog'
import { PayoutFormDialog } from './PayoutFormDialog'
import { PayoutSheetTable } from './PayoutSheetTable'
import { PayoutsPageHeader } from './PayoutsPageHeader'
import { UnlinkedAdvancesBanner } from './UnlinkedAdvancesBanner'

type Props = {
  embedded?: boolean
  canPay?: boolean
  initialRunId?: string | null
}

export function PayrollPayoutsPage({
  embedded = false,
  canPay = true,
  initialRunId = null,
}: Props) {
  const { data: runs, isLoading: runsLoading } = usePayrollRunsForPayout()
  const [runId, setRunId] = useState<string | null>(initialRunId)
  const effectiveRunId = runId ?? initialRunId ?? runs?.[0]?.id ?? null

  const { data: sheet, isLoading: sheetLoading } = usePayoutSheet(effectiveRunId)
  const { data: advances = [] } = useUnlinkedAdvances(effectiveRunId, canPay)
  const { data: employees = [] } = useEmployees()

  const createPayout = useCreateLinePayout(effectiveRunId ?? '')
  const closeRemainder = useCloseRemainder(effectiveRunId ?? '')
  const createAdvance = useCreateAdvance()
  const linkAdvance = useLinkAdvance(effectiveRunId ?? '')

  const [payLine, setPayLine] = useState<PayoutSheetLine | null>(null)
  const [advanceOpen, setAdvanceOpen] = useState(false)

  const selected = useMemo(
    () => runs?.find((r) => r.id === effectiveRunId) ?? null,
    [runs, effectiveRunId],
  )

  if (runsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className={embedded ? 'flex flex-col gap-4' : 'mx-auto flex max-w-6xl flex-col gap-4 p-4'}>
      <PayoutsPageHeader
        runs={runs ?? []}
        runId={effectiveRunId}
        onRunChange={setRunId}
        onAdvance={canPay ? () => setAdvanceOpen(true) : undefined}
        hideTitle={embedded}
      />

      {!runs?.length ? (
        <EmptyState
          icon={Banknote}
          title="Нет подтверждённых начислений"
          description="Сначала создайте и подтвердите начисление — затем фиксируйте выдачи здесь."
        />
      ) : (
        <>
          {selected && canPay && (
            <UnlinkedAdvancesBanner
              advances={advances}
              lines={sheet?.lines ?? []}
              linking={linkAdvance.isPending}
              onLink={(payoutId, lineId) => linkAdvance.mutate({ payoutId, lineId })}
            />
          )}
          {sheetLoading || !sheet ? (
            <Skeleton className="h-48 w-full" />
          ) : sheet.lines.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Нет строк"
              description="В этом начислении нет сотрудников для выдачи."
            />
          ) : (
            <PayoutSheetTable
              lines={sheet.lines}
              onPay={canPay ? setPayLine : undefined}
              onCloseRemainder={
                canPay
                  ? (line) => {
                      const comment = window.prompt(
                        'Комментарий для закрытия остатка (обязательно):',
                      )
                      if (!comment?.trim()) return
                      closeRemainder.mutate({
                        lineId: line.lineId,
                        comment: comment.trim(),
                      })
                    }
                  : undefined
              }
            />
          )}
        </>
      )}

      {canPay && payLine && effectiveRunId && (
        <PayoutFormDialog
          open
          onOpenChange={(o) => !o && setPayLine(null)}
          employeeName={payLine.employeeName}
          remainder={payLine.remainderAmount}
          submitting={createPayout.isPending}
          onSubmit={(payload) => {
            createPayout.mutate(
              { lineId: payLine.lineId, payload },
              { onSuccess: () => setPayLine(null) },
            )
          }}
        />
      )}

      {canPay && (
        <AdvanceFormDialog
          open={advanceOpen}
          onOpenChange={setAdvanceOpen}
          employees={employees.map((e) => ({
            id: e.id,
            fullName: e.employeeName,
            employeeCode: e.employeeCode,
          }))}
          submitting={createAdvance.isPending}
          onSubmit={(payload) => {
            createAdvance.mutate(payload, { onSuccess: () => setAdvanceOpen(false) })
          }}
        />
      )}
    </div>
  )
}
