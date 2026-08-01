import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

const SellerOrdersPage = lazy(() =>
  import('@/features/seller-market/components/SellerOrdersPage').then((m) => ({
    default: m.SellerOrdersPage,
  })),
)

export const Route = createFileRoute('/_layout/seller-market/orders/')({
  beforeLoad: makeActionBeforeLoad('marketplace.manage'),
  component: SellerOrdersPage,
})
