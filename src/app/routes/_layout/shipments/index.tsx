import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const ShipmentsPage = lazy(() =>
  import('@/features/shipments/components/ShipmentsPage').then((module) => ({
    default: module.ShipmentsPage,
  })),
)

export const Route = createFileRoute('/_layout/shipments/')({
  beforeLoad: makeSectionBeforeLoad('shipments'),
  component: ShipmentsPage,
})
