import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

const SellerOverviewPage = lazy(() =>
  import('@/features/seller-market/components/SellerOverviewPage').then((m) => ({
    default: m.SellerOverviewPage,
  })),
)

export const Route = createFileRoute('/_layout/seller-market/')({
  beforeLoad: makeActionBeforeLoad('marketplace.manage'),
  component: SellerOverviewPage,
})
