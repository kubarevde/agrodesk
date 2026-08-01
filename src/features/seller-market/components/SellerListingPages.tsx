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
      <div className="mb-3 space-y-2">
        <Link
          to="/seller-market/listings"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          ← К списку
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Новое объявление</h1>
      </div>
      <SellerListingForm mode="create" />
    </SellerMarketShell>
  )
}

export function SellerListingEditPage({ listingId }: { listingId: string }) {
  const listing = useSellerListing(listingId)

  return (
    <SellerMarketShell>
      <div className="mb-3 space-y-2">
        <Link
          to="/seller-market/listings"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          ← К списку
        </Link>
        <h1 className="text-lg font-semibold break-words text-foreground">
          {listing.data?.title?.trim() || 'Объявление'}
        </h1>
      </div>
      {listing.isLoading ? (
        <Skeleton className="h-64 w-full max-w-xl rounded-xl" />
      ) : listing.data ? (
        <SellerListingForm mode="edit" listing={listing.data} />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Объявление не найдено</p>
          <Link to="/seller-market/listings" className="text-sm font-medium text-primary hover:underline">
            К списку объявлений
          </Link>
        </div>
      )}
    </SellerMarketShell>
  )
}
