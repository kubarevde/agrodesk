import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

const SellerProfilePage = lazy(() =>
  import('@/features/seller-market/components/SellerProfilePage').then((m) => ({
    default: m.SellerProfilePage,
  })),
)

export const Route = createFileRoute('/_layout/seller-market/profile/')({
  beforeLoad: makeActionBeforeLoad('marketplace.manage'),
  component: SellerProfilePage,
})
