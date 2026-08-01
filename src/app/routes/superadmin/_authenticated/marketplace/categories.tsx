import { createFileRoute } from '@tanstack/react-router'
import { MarketplaceCategoriesPage } from '@/features/superadmin/components/MarketplaceCategoriesPage'

export const Route = createFileRoute('/superadmin/_authenticated/marketplace/categories')({
  component: MarketplaceCategoriesPage,
})
