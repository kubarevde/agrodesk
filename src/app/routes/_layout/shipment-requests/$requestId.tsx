import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

const ShipmentRequestDetailPage = lazy(() =>
  import('@/features/shipment-requests/components/ShipmentRequestDetailPage').then((module) => ({
    default: module.ShipmentRequestDetailPage,
  })),
)

export const Route = createFileRoute('/_layout/shipment-requests/$requestId')({
  beforeLoad: makeActionBeforeLoad('shipment_requests.manage'),
  component: function ShipmentRequestDetailRoute() {
    const { requestId } = Route.useParams()
    return <ShipmentRequestDetailPage requestId={requestId} />
  },
})
