import { createFileRoute } from '@tanstack/react-router'
import { ProductPage } from '@/features/marketplace-public/components/ProductPage'

export const Route = createFileRoute('/market/product/$id')({
  component: ProductRoute,
})

function ProductRoute() {
  const { id } = Route.useParams()
  return <ProductPage listingId={id} />
}
