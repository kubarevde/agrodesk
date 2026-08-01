import { createFileRoute } from '@tanstack/react-router'
import { SellerPage } from '@/features/marketplace-public/components/SellerPage'

export const Route = createFileRoute('/market/seller/$id')({
  component: SellerRoute,
})

function SellerRoute() {
  const { id } = Route.useParams()
  return <SellerPage sellerId={id} />
}
