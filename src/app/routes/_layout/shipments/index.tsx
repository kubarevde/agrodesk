import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const ShipmentsPage = lazy(() =>
  import('@/features/shipments/components/ShipmentsPage').then((module) => ({
    default: module.ShipmentsPage,
  })),
)

export const Route = createFileRoute('/_layout/shipments/')({
  component: ShipmentsPage,
})
