import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

const SellerListingNewPage = lazy(() =>
  import('@/features/seller-market/components/SellerListingPages').then((m) => ({
    default: m.SellerListingNewPage,
  })),
)

export const Route = createFileRoute('/_layout/seller-market/listings/new')({
  beforeLoad: makeActionBeforeLoad('marketplace.manage'),
  component: SellerListingNewPage,
})
