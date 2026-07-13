import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const ExpensesPage = lazy(() =>
  import('@/features/expenses/components/ExpensesPage').then((module) => ({
    default: module.ExpensesPage,
  })),
)

export const Route = createFileRoute('/_layout/expenses/')({
  component: ExpensesPage,
})
