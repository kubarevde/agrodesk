import { lazy, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const InventoryPage = lazy(() =>
  import('@/features/inventory/components/InventoryPage').then((module) => ({
    default: module.InventoryPage,
  })),
)

export type InventorySearch = {
  category?: string
  search?: string
}

export const Route = createFileRoute('/_layout/inventory/')({
  validateSearch: (search: Record<string, unknown>): InventorySearch => ({
    category: typeof search.category === 'string' && search.category ? search.category : undefined,
    search: typeof search.search === 'string' && search.search ? search.search : undefined,
  }),
  beforeLoad: makeSectionBeforeLoad('inventory'),
  component: function InventoryRoute() {
    const { category, search } = Route.useSearch()
    const navigate = Route.useNavigate()
    const onCategoryChange = useCallback(
      (next: string) => {
        void navigate({
          search: (prev) => ({
            ...prev,
            category: next === 'all' ? undefined : next,
          }),
          replace: true,
        })
      },
      [navigate],
    )
    const onSearchChange = useCallback(
      (next: string) => {
        const trimmed = next.trim()
        void navigate({
          search: (prev) => ({
            ...prev,
            search: trimmed ? trimmed : undefined,
          }),
          replace: true,
        })
      },
      [navigate],
    )
    return (
      <InventoryPage
        category={category ?? 'all'}
        search={search ?? ''}
        onCategoryChange={onCategoryChange}
        onSearchChange={onSearchChange}
      />
    )
  },
})
