import { Link } from '@tanstack/react-router'
import { BadgeCheck, ChevronRight, ImageOff } from 'lucide-react'
import { formatMarketPriceAmount, isListingInStock, photoSrc, publicStockShort } from '../lib'
import type { PublicListingCard } from '../types'

export function ListingCard({ listing }: { listing: PublicListingCard }) {
  const img = photoSrc(listing.photos)
  const unit = (listing.unit || '').trim() || 'ед.'
  const inStock = isListingInStock(listing.quantity_available)

  return (
    <Link
      to="/market/product/$id"
      params={{ id: listing.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="listing-card"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {img ? (
          <img
            src={img}
            alt={listing.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        <h2 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-foreground sm:min-h-0 sm:text-[0.95rem]">
          {listing.title}
        </h2>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tabular-nums text-primary sm:text-lg">
            {formatMarketPriceAmount(listing.price)}
          </p>
          <p className="truncate text-xs text-muted-foreground">за {unit}</p>
          <p
            className={
              inStock
                ? 'truncate text-xs tabular-nums text-muted-foreground'
                : 'truncate text-xs text-muted-foreground'
            }
            data-testid="listing-card-stock"
          >
            {publicStockShort(listing.quantity_available, unit)}
          </p>
        </div>
        <p className="mt-auto flex min-w-0 items-center gap-1 pt-1 text-xs text-muted-foreground">
          <span className="truncate">{listing.seller.display_name}</span>
          {listing.seller.is_verified ? (
            <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Проверен" />
          ) : null}
        </p>
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
          Смотреть
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}
