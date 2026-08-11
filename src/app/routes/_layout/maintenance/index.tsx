import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const MaintenancePage = lazy(() =>
  import('@/features/repair-journal/components/MaintenancePage').then((module) => ({
    default: module.MaintenancePage,
  })),
)

type MaintenanceSearch = {
  equipmentId?: string
  implementId?: string
  search?: string
}

export const Route = createFileRoute('/_layout/maintenance/')({
  beforeLoad: makeSectionBeforeLoad('maintenance'),
  validateSearch: (search: Record<string, unknown>): MaintenanceSearch => ({
    equipmentId:
      typeof search.equipmentId === 'string' && search.equipmentId
        ? search.equipmentId
        : undefined,
    implementId:
      typeof search.implementId === 'string' && search.implementId
        ? search.implementId
        : undefined,
    search: typeof search.search === 'string' && search.search ? search.search : undefined,
  }),
  component: MaintenancePage,
})
