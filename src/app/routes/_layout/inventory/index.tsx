import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const InventoryPage = lazy(() =>
  import('@/features/inventory/components/InventoryPage').then((module) => ({
    default: module.InventoryPage,
  })),
)

export const Route = createFileRoute('/_layout/inventory/')({
  component: InventoryPage,
})
