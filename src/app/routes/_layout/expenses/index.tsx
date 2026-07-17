import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const ExpensesPage = lazy(() =>
  import('@/features/expenses/components/ExpensesPage').then((module) => ({
    default: module.ExpensesPage,
  })),
)

export const Route = createFileRoute('/_layout/expenses/')({
  beforeLoad: makeSectionBeforeLoad('expenses'),
  component: ExpensesPage,
})
