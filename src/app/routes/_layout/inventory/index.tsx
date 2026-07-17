import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const InventoryPage = lazy(() =>
  import('@/features/inventory/components/InventoryPage').then((module) => ({
    default: module.InventoryPage,
  })),
)

export const Route = createFileRoute('/_layout/inventory/')({
  beforeLoad: makeSectionBeforeLoad('inventory'),
  component: InventoryPage,
})
