import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const EmployeesPage = lazy(() =>
  import('@/features/employees/components/EmployeesPage').then((module) => ({
    default: module.EmployeesPage,
  })),
)

export const Route = createFileRoute('/_layout/employees/')({
  beforeLoad: makeSectionBeforeLoad('employees'),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === 'salary' ? ('salary' as const) : ('list' as const),
  }),
  component: EmployeesPage,
})
