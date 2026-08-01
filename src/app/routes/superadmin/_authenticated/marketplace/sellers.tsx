import { createFileRoute } from '@tanstack/react-router'
import { MarketplaceSellersPage } from '@/features/superadmin/components/MarketplaceSellersPage'

export const Route = createFileRoute('/superadmin/_authenticated/marketplace/sellers')({
  component: MarketplaceSellersPage,
})
