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
}

export const Route = createFileRoute('/_layout/maintenance/')({
  beforeLoad: makeSectionBeforeLoad('maintenance'),
  validateSearch: (search: Record<string, unknown>): MaintenanceSearch => ({
    equipmentId:
      typeof search.equipmentId === 'string' && search.equipmentId
        ? search.equipmentId
        : undefined,
  }),
  component: MaintenancePage,
})
