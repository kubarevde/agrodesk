import { lazy, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const FieldsPage = lazy(() =>
  import('@/features/fields/components/FieldsPage').then((module) => ({
    default: module.FieldsPage,
  })),
)

export type FieldsSearch = {
  search?: string
}

export const Route = createFileRoute('/_layout/fields/')({
  beforeLoad: makeSectionBeforeLoad('fields'),
  validateSearch: (search: Record<string, unknown>): FieldsSearch => ({
    search: typeof search.search === 'string' && search.search ? search.search : undefined,
  }),
  component: function FieldsRoute() {
    const { search } = Route.useSearch()
    const navigate = Route.useNavigate()
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
    return <FieldsPage search={search ?? ''} onSearchChange={onSearchChange} />
  },
})
