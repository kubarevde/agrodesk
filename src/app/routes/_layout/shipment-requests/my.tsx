import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

const MyShipmentsPage = lazy(() =>
  import('@/features/shipment-requests/components/MyShipmentsPage').then((module) => ({
    default: module.MyShipmentsPage,
  })),
)

export const Route = createFileRoute('/_layout/shipment-requests/my')({
  beforeLoad: makeActionBeforeLoad('shipment_requests.execute'),
  component: MyShipmentsPage,
})
