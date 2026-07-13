import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const EmployeesPage = lazy(() =>
  import('@/features/employees/components/EmployeesPage').then((module) => ({
    default: module.EmployeesPage,
  })),
)

export const Route = createFileRoute('/_layout/employees/')({
  component: EmployeesPage,
})
