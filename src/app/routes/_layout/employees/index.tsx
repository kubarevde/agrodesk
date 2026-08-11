import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'
import type { PayrollSubTab } from '@/features/payroll/types'

const EmployeesPage = lazy(() =>
  import('@/features/employees/components/EmployeesPage').then((module) => ({
    default: module.EmployeesPage,
  })),
)

const PAYROLL_SUBS: PayrollSubTab[] = ['accruals', 'payouts', 'rates', 'reports']

function parsePayroll(value: unknown): PayrollSubTab {
  return PAYROLL_SUBS.includes(value as PayrollSubTab)
    ? (value as PayrollSubTab)
    : 'accruals'
}

export type EmployeesSearch = {
  tab: 'list' | 'salary'
  payroll?: PayrollSubTab
  runId?: string
}

export const Route = createFileRoute('/_layout/employees/')({
  beforeLoad: makeSectionBeforeLoad('employees'),
  validateSearch: (search: Record<string, unknown>): EmployeesSearch => {
    const tab = search.tab === 'salary' ? ('salary' as const) : ('list' as const)
    const result: EmployeesSearch = { tab }
    if (tab === 'salary') {
      result.payroll = parsePayroll(search.payroll)
      if (typeof search.runId === 'string' && search.runId) {
        result.runId = search.runId
      }
    }
    return result
  },
  component: EmployeesPage,
})
