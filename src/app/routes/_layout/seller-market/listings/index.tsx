import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

const SellerListingsPage = lazy(() =>
  import('@/features/seller-market/components/SellerListingsPage').then((m) => ({
    default: m.SellerListingsPage,
  })),
)

export const Route = createFileRoute('/_layout/seller-market/listings/')({
  beforeLoad: makeActionBeforeLoad('marketplace.manage'),
  component: SellerListingsPage,
})
