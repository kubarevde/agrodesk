import { createFileRoute } from '@tanstack/react-router'
import { MarketplaceOrdersPage } from '@/features/superadmin/components/MarketplaceOrdersPage'

export const Route = createFileRoute('/superadmin/_authenticated/marketplace/orders')({
  component: MarketplaceOrdersPage,
})
