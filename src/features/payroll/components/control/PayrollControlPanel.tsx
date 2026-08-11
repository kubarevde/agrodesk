import { useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { ClipboardList, ShieldAlert } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { isoDateToDisplay } from '@/lib/transformers'
import { usePayrollControlSummary } from '../../controlHooks'
import type { PayrollControlDynamicsRow } from '../../controlTypes'
import { PayrollControlAttention } from './PayrollControlAttention'
import { PayrollControlDynamics } from './PayrollControlDynamics'
import { PayrollControlEmployees } from './PayrollControlEmployees'
import { PayrollControlExports } from './PayrollControlExports'
import { PayrollControlKpi } from './PayrollControlKpi'
import { PayrollControlMonthSheet } from './PayrollControlMonthSheet'
import {
  defaultControlPeriod,
  PayrollControlPeriodFilter,
  type PeriodPreset,
} from './PayrollControlPeriodFilter'
import { PayrollControlSchemes } from './PayrollControlSchemes'

const employeesRoute = getRouteApi('/_layout/employees/')

type Props = {
  canViewAll: boolean
}

export function PayrollControlPanel({ canViewAll }: Props) {
  const employeesNavigate = employeesRoute.useNavigate()
  const navigate = useNavigate()
  const initial = defaultControlPeriod()
  const [preset, setPreset] = useState<PeriodPreset>(initial.preset)
  const [fromIso, setFromIso] = useState(initial.fromIso)
  const [toIso, setToIso] = useState(initial.toIso)
  const [monthSheetRow, setMonthSheetRow] = useState<PayrollControlDynamicsRow | null>(null)

  const { data, isLoading, isError, refetch } = usePayrollControlSummary(
    fromIso,
    toIso,
    canViewAll,
  )

  const openAccruals = (runId?: string) => {
    void employeesNavigate({
      search: (prev) => ({
        ...prev,
        tab: 'salary',
        payroll: 'accruals',
        runId: runId || undefined,
      }),
    })
  }

  const openPayouts = () => {
    void employeesNavigate({
      search: (prev) => ({
        ...prev,
        tab: 'salary',
        payroll: 'payouts',
        runId: undefined,
      }),
    })
  }

  const openExpenses = (from = fromIso, to = toIso) => {
    void navigate({
      to: '/expenses',
      search: {
        tab: 'expenses',
        category: 'salary',
        from: isoDateToDisplay(from),
        to: isoDateToDisplay(to),
      },
    })
  }

  if (!canViewAll) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Нужно право видеть все начисления"
        description="Раздел «Контроль и отчётность» доступен пользователям с правом видеть начисления всех сотрудников."
      />
    )
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <p className="text-sm text-muted-foreground">
        Здесь можно проверить, сколько начислено, проведено в расходы, выдано сотрудникам и
        осталось к выплате за выбранный период
      </p>

      <PayrollControlPeriodFilter
        preset={preset}
        fromIso={fromIso}
        toIso={toIso}
        onChange={(next) => {
          setPreset(next.preset)
          setFromIso(next.fromIso)
          setToIso(next.toIso)
        }}
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError || !data ? (
        <EmptyState
          icon={ClipboardList}
          title="Не удалось загрузить сводку"
          description="Проверьте соединение и права доступа, затем повторите"
          action={{ label: 'Повторить', onClick: () => void refetch() }}
        />
      ) : (
        <>
          <PayrollControlKpi
            kpi={data.kpi}
            periodFrom={fromIso}
            periodTo={toIso}
            onOpenAccruals={() => openAccruals()}
            onOpenExpenses={openExpenses}
            onOpenPayouts={openPayouts}
          />
          <PayrollControlAttention
            groups={data.attention}
            onOpenRun={(runId) => openAccruals(runId)}
            onOpenPayouts={openPayouts}
            onOpenExpenses={() => openExpenses()}
          />
          <PayrollControlDynamics
            rows={data.dynamics}
            onOpenMonth={(row) => setMonthSheetRow(row)}
          />
          <PayrollControlEmployees
            rows={data.employees}
            onOpenRun={(runId) => openAccruals(runId)}
          />
          <PayrollControlSchemes rows={data.schemes} />
          <PayrollControlExports periodStart={fromIso} periodEnd={toIso} />
          <PayrollControlMonthSheet
            row={monthSheetRow}
            open={monthSheetRow != null}
            onOpenChange={(open) => {
              if (!open) setMonthSheetRow(null)
            }}
            onOpenAccruals={() => {
              setMonthSheetRow(null)
              openAccruals()
            }}
            onOpenPayouts={() => {
              setMonthSheetRow(null)
              openPayouts()
            }}
            onOpenExpenses={(ms, me) => {
              setMonthSheetRow(null)
              openExpenses(ms, me)
            }}
          />
        </>
      )}
    </div>
  )
}
