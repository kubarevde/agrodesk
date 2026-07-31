import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

const ShipmentRequestsPage = lazy(() =>
  import('@/features/shipment-requests/components/ShipmentRequestsPage').then((module) => ({
    default: module.ShipmentRequestsPage,
  })),
)

export const Route = createFileRoute('/_layout/shipment-requests/')({
  validateSearch: (search: Record<string, unknown>) => ({
    focus: search.focus === 'active' ? ('active' as const) : undefined,
    createItemId: typeof search.createItemId === 'string' ? search.createItemId : undefined,
  }),
  beforeLoad: makeActionBeforeLoad('shipment_requests.manage'),
  component: function ShipmentRequestsRoute() {
    const { createItemId } = Route.useSearch()
    return <ShipmentRequestsPage initialCreateItemId={createItemId ?? null} />
  },
})
