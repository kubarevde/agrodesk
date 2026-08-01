import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeActionBeforeLoad } from '@/lib/routeSectionGuard'

const SellerListingEditPage = lazy(() =>
  import('@/features/seller-market/components/SellerListingPages').then((m) => ({
    default: m.SellerListingEditPage,
  })),
)

export const Route = createFileRoute('/_layout/seller-market/listings/$listingId')({
  beforeLoad: makeActionBeforeLoad('marketplace.manage'),
  component: function SellerListingEditRoute() {
    const { listingId } = Route.useParams()
    return <SellerListingEditPage listingId={listingId} />
  },
})
