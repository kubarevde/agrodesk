import { createFileRoute } from '@tanstack/react-router'
import { CatalogPage } from '@/features/marketplace-public/components/CatalogPage'

export const Route = createFileRoute('/market/')({
  component: CatalogPage,
})
