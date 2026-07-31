import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const ShipmentsPage = lazy(() =>
  import('@/features/shipments/components/ShipmentsPage').then((module) => ({
    default: module.ShipmentsPage,
  })),
)

export const Route = createFileRoute('/_layout/shipments/')({
  validateSearch: (search: Record<string, unknown>) => ({
    requestId: typeof search.requestId === 'string' ? search.requestId : undefined,
  }),
  beforeLoad: makeSectionBeforeLoad('shipments'),
  component: function ShipmentsRoute() {
    const { requestId } = Route.useSearch()
    return <ShipmentsPage initialRequestId={requestId ?? null} />
  },
})
