import { createFileRoute } from '@tanstack/react-router'
import { MarketplaceQueuePage } from '@/features/superadmin/components/MarketplaceQueuePage'

export const Route = createFileRoute('/superadmin/_authenticated/marketplace/')({
  component: MarketplaceQueuePage,
})
