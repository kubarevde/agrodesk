import { Link } from '@tanstack/react-router'
import { BadgeCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicListing, usePublicSeller } from '../hooks'
import { formatMarketPrice, formatMarketQty } from '../lib'
import { MarketShell } from './MarketShell'
import { OrderForm } from './OrderForm'
import { PhotoGallery } from './PhotoGallery'
import { ReviewList } from './ReviewList'

export function ProductPage({ listingId }: { listingId: string }) {
  const listingQuery = usePublicListing(listingId)
  const sellerId = listingQuery.data?.seller.id ?? ''
  const sellerQuery = usePublicSeller(sellerId)

  if (listingQuery.isLoading) {
    return (
      <MarketShell>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </MarketShell>
    )
  }

  if (listingQuery.isError || !listingQuery.data) {
    return (
      <MarketShell>
        <div className="space-y-3 py-8 text-center">
          <p className="font-medium text-foreground">Товар не найден</p>
          <p className="text-sm text-muted-foreground">
            Объявление снято с витрины или ещё не опубликовано.
          </p>
          <Link to="/market" className="text-sm text-primary hover:underline">
            Вернуться в каталог
          </Link>
        </div>
      </MarketShell>
    )
  }

  const listing = listingQuery.data
  const maxQty = Number(listing.quantity_available)
  const reviews = sellerQuery.data?.reviews ?? []

  return (
    <MarketShell title={listing.title}>
      <div className="mb-4">
        <Link to="/market" className="text-sm text-muted-foreground hover:text-primary">
          ← В каталог
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <PhotoGallery photos={listing.photos ?? []} title={listing.title} />
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {listing.title}
            </h1>
            <p className="mt-2 text-xl font-semibold tabular-nums text-primary">
              {formatMarketPrice(listing.price, listing.unit)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              В наличии: {formatMarketQty(listing.quantity_available, listing.unit)}
            </p>
          </div>

          <Link
            to="/market/seller/$id"
            params={{ id: listing.seller.id }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {listing.seller.display_name}
            {listing.seller.is_verified ? (
              <BadgeCheck className="size-4" aria-label="Проверенный продавец" />
            ) : null}
          </Link>

          {listing.description ? (
            <div>
              <h2 className="text-sm font-medium text-foreground">Описание</h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {listing.description}
              </p>
            </div>
          ) : null}

          <OrderForm
            listingId={listing.id}
            maxQuantity={Number.isFinite(maxQty) ? maxQty : 1}
            unit={listing.unit}
          />

          <div>
            <h2 className="mb-2 text-sm font-medium text-foreground">Отзывы о продавце</h2>
            {sellerQuery.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <ReviewList reviews={reviews} />
            )}
          </div>
        </div>
      </div>
    </MarketShell>
  )
}
