import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeAnySectionBeforeLoad } from '@/lib/routeSectionGuard'

const ExpensesPage = lazy(() =>
  import('@/features/expenses/components/ExpensesPage').then((module) => ({
    default: module.ExpensesPage,
  })),
)

export type ExpensesTabId = 'expenses' | 'income' | 'forecast'

export type ExpensesSearch = {
  tab: ExpensesTabId
  category?: string
  from?: string
  to?: string
}

export const Route = createFileRoute('/_layout/expenses/')({
  validateSearch: (search: Record<string, unknown>): ExpensesSearch => {
    const result: ExpensesSearch = {
      tab:
        search.tab === 'income'
          ? 'income'
          : search.tab === 'forecast'
            ? 'forecast'
            : 'expenses',
    }
    if (typeof search.category === 'string' && search.category) {
      result.category = search.category
    }
    if (typeof search.from === 'string' && search.from) {
      result.from = search.from
    }
    if (typeof search.to === 'string' && search.to) {
      result.to = search.to
    }
    return result
  },
  // analytics grant still opens this page (legacy «Прогноз» access groups).
  beforeLoad: makeAnySectionBeforeLoad(['expenses', 'analytics']),
  component: function ExpensesRoute() {
    const { tab, category, from, to } = Route.useSearch()
    return (
      <ExpensesPage
        initialTab={tab}
        initialCategory={category}
        initialFrom={from}
        initialTo={to}
      />
    )
  },
})
