import { PackageSearch } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { ListingCard } from './ListingCard'
import type { PublicListingCard } from '../types'

export function ListingGrid({
  items,
  isLoading,
  emptyTitle,
  emptyDescription,
  onResetFilters,
}: {
  items: PublicListingCard[]
  isLoading: boolean
  emptyTitle: string
  emptyDescription: string
  onResetFilters?: () => void
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" data-testid="listing-grid-skeleton">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-4/5 max-w-[12rem]" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <EmptyState
        icon={PackageSearch}
        title={emptyTitle}
        description={emptyDescription}
        action={
          onResetFilters
            ? { label: 'Сбросить фильтры', onClick: onResetFilters }
            : undefined
        }
      />
    )
  }

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
      data-testid="listing-grid"
    >
      {items.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
