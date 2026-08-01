import { Link } from '@tanstack/react-router'
import { BadgeCheck, ImageOff } from 'lucide-react'
import { formatMarketPrice, photoSrc } from '../lib'
import type { PublicListingCard } from '../types'

export function ListingCard({ listing }: { listing: PublicListingCard }) {
  const img = photoSrc(listing.photos)

  return (
    <Link
      to="/market/product/$id"
      params={{ id: listing.id }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="listing-card"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {img ? (
          <img
            src={img}
            alt=""
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
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        <h2 className="line-clamp-2 text-sm font-medium leading-snug text-foreground sm:text-[0.95rem]">
          {listing.title}
        </h2>
        <p className="text-base font-semibold tabular-nums text-primary">
          {formatMarketPrice(listing.price, listing.unit)}
        </p>
        <p className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">{listing.seller.display_name}</span>
          {listing.seller.is_verified ? (
            <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Проверен" />
          ) : null}
        </p>
      </div>
    </Link>
  )
}
