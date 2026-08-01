import { Link } from '@tanstack/react-router'
import { ImageOff } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SellerListing } from '../types'
import {
  LISTING_STATUS_HINTS,
  listingListActionLabel,
  listingQtyListCaption,
  listingRejectionVisible,
} from '../labels'
import { LISTING_ROW_ACCENT, ListingStatusBadge, RejectionBanner } from './ListingStatusBadge'

export function SellerListingRow({
  item,
  archivePending,
  onArchive,
}: {
  item: SellerListing
  archivePending: boolean
  onArchive: (id: string) => void
}) {
  const rejection = listingRejectionVisible(item)
  const thumb = item.photos?.[0]?.trim() || null
  const actionLabel = listingListActionLabel(item.status)

  return (
    <li
      className={cn(
        'rounded-xl border border-border border-l-4 bg-surface p-3 sm:p-4',
        LISTING_ROW_ACCENT[item.status],
      )}
      data-testid="seller-listing-row"
      data-status={item.status}
    >
      <div className="flex gap-3">
        <div className="hidden size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
          {thumb ? (
            <img src={thumb} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-5" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-foreground">{item.title || 'Без названия'}</p>
                <ListingStatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {Number(item.price).toLocaleString('ru-RU')} ₽ / {item.unit} ·{' '}
                {listingQtyListCaption(item)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {LISTING_STATUS_HINTS[item.status]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/seller-market/listings/$listingId"
                params={{ listingId: item.id }}
                className={cn(
                  buttonVariants({
                    variant: item.status === 'rejected' ? 'default' : 'outline',
                    size: 'sm',
                  }),
                  'min-h-10',
                  item.status === 'rejected' &&
                    'bg-primary text-primary-foreground hover:bg-primary-hover',
                )}
              >
                {actionLabel}
              </Link>
              {item.status !== 'archived' ? (
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'min-h-10')}
                  disabled={archivePending}
                  onClick={() => onArchive(item.id)}
                >
                  В архив
                </button>
              ) : null}
            </div>
          </div>
          {rejection ? <RejectionBanner reason={rejection} showFixHint /> : null}
        </div>
      </div>
    </li>
  )
}
