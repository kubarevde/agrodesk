import { lazy, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const EquipmentPage = lazy(() =>
  import('@/features/equipment/components/EquipmentPage').then((module) => ({
    default: module.EquipmentPage,
  })),
)

export type EquipmentSearch = {
  search?: string
}

export const Route = createFileRoute('/_layout/equipment/')({
  beforeLoad: makeSectionBeforeLoad('equipment'),
  validateSearch: (search: Record<string, unknown>): EquipmentSearch => ({
    search: typeof search.search === 'string' && search.search ? search.search : undefined,
  }),
  component: function EquipmentRoute() {
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
    return <EquipmentPage search={search ?? ''} onSearchChange={onSearchChange} />
  },
})
