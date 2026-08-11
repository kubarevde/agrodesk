import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const EmployeeDetailPage = lazy(() =>
  import('@/features/employees/components/EmployeeDetailPage').then((module) => ({
    default: module.EmployeeDetailPage,
  })),
)

function EmployeeDetailRoute() {
  const { employeeId } = Route.useParams()
  return <EmployeeDetailPage employeeId={employeeId} />
}

export const Route = createFileRoute('/_layout/employees/$employeeId')({
  beforeLoad: makeSectionBeforeLoad('employees'),
  component: EmployeeDetailRoute,
})
