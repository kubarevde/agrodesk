import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSellerListing } from '../hooks'
import { SellerListingForm } from './SellerListingForm'
import { SellerMarketShell } from './SellerMarketShell'

export function SellerListingNewPage() {
  return (
    <SellerMarketShell>
      <div className="mb-3">
        <Link
          to="/seller-market/listings"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          ← К списку
        </Link>
      </div>
      <SellerListingForm mode="create" />
    </SellerMarketShell>
  )
}

export function SellerListingEditPage({ listingId }: { listingId: string }) {
  const listing = useSellerListing(listingId)

  return (
    <SellerMarketShell>
      <div className="mb-3">
        <Link
          to="/seller-market/listings"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          ← К списку
        </Link>
      </div>
      {listing.isLoading ? (
        <Skeleton className="h-64 w-full max-w-xl" />
      ) : listing.data ? (
        <SellerListingForm mode="edit" listing={listing.data} />
      ) : (
        <p className="text-sm text-muted-foreground">Объявление не найдено</p>
      )}
    </SellerMarketShell>
  )
}
