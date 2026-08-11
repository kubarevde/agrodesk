import { getRouteApi } from '@tanstack/react-router'
import { useMemo } from 'react'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { useCurrentUser } from '@/features/auth/hooks'
import {
  payrollAccrualsHelp,
  payrollPayoutsHelp,
  payrollRatesHelp,
  payrollReportsHelp,
} from '@/features/help/content'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { hasAction } from '@/lib/permissionActions'
import { PAYROLL_SUB_OPTIONS } from '../payrollNav'
import type { PayrollSubTab } from '../types'
import { PayrollAccrualsPanel } from './PayrollAccrualsPanel'
import { PayrollPayoutsPanel } from './PayrollPayoutsPanel'
import { PayrollRatesPanel } from './PayrollRatesPanel'
import { PayrollReportsPanel } from './PayrollReportsPanel'

const MOBILE_SUB_LABELS: Record<PayrollSubTab, string> = {
  accruals: 'Начисления',
  payouts: 'Выдача',
  rates: 'Ставки',
  reports: 'Контроль',
}

const employeesRoute = getRouteApi('/_layout/employees/')

const HELP_BY_SUB = {
  accruals: { section: 'начисления', items: payrollAccrualsHelp },
  payouts: { section: 'выдача ЗП', items: payrollPayoutsHelp },
  rates: { section: 'ставки и схемы', items: payrollRatesHelp },
  reports: { section: 'контроль и отчётность', items: payrollReportsHelp },
} as const

export function PayrollLaborTab() {
  const { payroll = 'accruals', runId } = employeesRoute.useSearch()
  const navigate = employeesRoute.useNavigate()
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const isMobile = useIsMobile()
  const actions = perms?.actions
  const role = user?.role

  const canConfirm = hasAction(actions, 'payroll.confirm', role)
  const canPay = hasAction(actions, 'payroll.pay', role)
  const canManageRates = hasAction(actions, 'payroll.manage_rates', role)
  const canViewAll = hasAction(actions, 'payroll.view_all', role)

  const subOptions = useMemo(
    () =>
      PAYROLL_SUB_OPTIONS.map((opt) => ({
        ...opt,
        label: isMobile ? MOBILE_SUB_LABELS[opt.value] : opt.label,
      })),
    [isMobile],
  )

  const setSub = (next: PayrollSubTab) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        tab: 'salary',
        payroll: next,
        runId: next === 'accruals' || next === 'payouts' ? prev.runId : undefined,
      }),
    })
  }

  const help = HELP_BY_SUB[payroll]

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <SegmentedControl
        value={payroll}
        onChange={setSub}
        options={subOptions}
        size="lg"
        ariaLabel="Разделы оплаты труда"
      />

      <SectionHelp section={help.section} items={help.items} role={role} />

      {payroll === 'accruals' && (
        <PayrollAccrualsPanel
          runId={runId ?? null}
          canConfirm={canConfirm}
          canPay={canPay}
          canViewAll={canViewAll}
          onOpenRun={(id) =>
            void navigate({
              search: (prev) => ({ ...prev, tab: 'salary', payroll: 'accruals', runId: id }),
            })
          }
          onClearRun={() =>
            void navigate({
              search: (prev) => ({
                ...prev,
                tab: 'salary',
                payroll: 'accruals',
                runId: undefined,
              }),
            })
          }
        />
      )}
      {payroll === 'payouts' && (
        <PayrollPayoutsPanel canPay={canPay} canView={canPay || canViewAll} />
      )}
      {payroll === 'rates' && (
        <PayrollRatesPanel canManage={canManageRates} canView={canManageRates || canViewAll} />
      )}
      {payroll === 'reports' && <PayrollReportsPanel canViewAll={canViewAll} />}
    </div>
  )
}
