import { lazy, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const InventoryOperationsPage = lazy(() =>
  import('@/features/inventory/components/InventoryOperationsPage').then((module) => ({
    default: module.InventoryOperationsPage,
  })),
)

export type InventoryOperationsSearch = {
  from?: string
  to?: string
}

function parseDateSearch(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(value) ? value : undefined
}

export const Route = createFileRoute('/_layout/inventory/operations')({
  validateSearch: (search: Record<string, unknown>): InventoryOperationsSearch => {
    const defaults = getDefaultMonthRange()
    return {
      from: parseDateSearch(search.from) ?? defaults.from,
      to: parseDateSearch(search.to) ?? defaults.to,
    }
  },
  beforeLoad: makeSectionBeforeLoad('inventory'),
  component: function InventoryOperationsRoute() {
    const { from, to } = Route.useSearch()
    const navigate = Route.useNavigate()
    const onRangeChange = useCallback(
      (range: { from?: string; to?: string }) => {
        void navigate({
          search: {
            from: range.from,
            to: range.to,
          },
          replace: true,
        })
      },
      [navigate],
    )
    return <InventoryOperationsPage from={from} to={to} onRangeChange={onRangeChange} />
  },
})
