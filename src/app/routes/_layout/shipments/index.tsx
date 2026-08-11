import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const ShipmentsPage = lazy(() =>
  import('@/features/shipments/components/ShipmentsPage').then((module) => ({
    default: module.ShipmentsPage,
  })),
)

export type ShipmentsTab = 'harvest' | 'tmc'

export type ShipmentsSearch = {
  tab: ShipmentsTab
  requestId?: string
}

export const Route = createFileRoute('/_layout/shipments/')({
  validateSearch: (search: Record<string, unknown>): ShipmentsSearch => {
    const result: ShipmentsSearch = {
      tab: search.tab === 'tmc' ? 'tmc' : 'harvest',
    }
    if (typeof search.requestId === 'string' && search.requestId) {
      result.requestId = search.requestId
    }
    return result
  },
  beforeLoad: makeSectionBeforeLoad('shipments'),
  component: function ShipmentsRoute() {
    const { requestId, tab } = Route.useSearch()
    return <ShipmentsPage initialRequestId={requestId ?? null} initialTab={tab} />
  },
})
