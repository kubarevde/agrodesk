import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const PurchasePlannerPage = lazy(() =>
  import('@/features/purchase-planner/components/PurchasePlannerPage').then((module) => ({
    default: module.PurchasePlannerPage,
  })),
)

export const Route = createFileRoute('/_layout/purchase-planner/')({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === 'checklist' ? ('checklist' as const) : undefined,
    equipmentId: typeof search.equipmentId === 'string' ? search.equipmentId : undefined,
    implementId: typeof search.implementId === 'string' ? search.implementId : undefined,
    maintenanceId: typeof search.maintenanceId === 'string' ? search.maintenanceId : undefined,
  }),
  beforeLoad: makeSectionBeforeLoad('purchase-planner'),
  component: PurchasePlannerPage,
})
