import { Handshake, MapPin, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FieldResponse } from '@/features/fields/types'
import { mediaUrl } from '@/lib/media'
import { regionLabel } from '@/lib/regions.ru'
import type { SharingListing } from '../types'
import { SCOPE_LABELS, STATUS_LABELS } from '../types'
import { formatListingPrice, resourceLabel, typeBadgeLabel } from '../utils'

type SharingListingCardProps = {
  listing: SharingListing
  field?: FieldResponse | null
  isOwn: boolean
  onDetails: () => void
  onRequest: () => void
}

export function SharingListingCard({
  listing,
  field,
  isOwn,
  onDetails,
  onRequest,
}: SharingListingCardProps) {
  const cover = listing.images[0]
  const resource = resourceLabel(listing, field)

  return (
    <Card
      className="flex flex-col overflow-hidden transition-colors hover:border-primary/40"
      data-testid="sharing-listing-card"
    >
      {cover ? (
        <div className="flex h-28 w-full items-center justify-center bg-muted sm:h-36">
          <img
            src={mediaUrl(cover)}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-20 w-full items-center justify-center bg-muted text-muted-foreground sm:h-24">
          <Handshake className="size-7 opacity-50 sm:size-8" />
        </div>
      )}

      <CardHeader className="space-y-2 p-3 pb-2 sm:p-4 sm:pb-2">
        <CardTitle className="min-w-0 text-base font-semibold leading-snug break-words text-foreground sm:text-lg">
          {listing.title}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{typeBadgeLabel(listing.type)}</Badge>
          {listing.type === 'field' ? (
            <Badge variant="outline">{SCOPE_LABELS[listing.sharingScope]}</Badge>
          ) : null}
          <Badge variant="secondary">{STATUS_LABELS[listing.status]}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-3 pt-0 sm:p-4 sm:pt-0">
        <p className="text-base font-medium tabular-nums text-foreground">
          {formatListingPrice(listing)}
        </p>

        {listing.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
        ) : null}

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {listing.region ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {regionLabel(listing.region)}
            </p>
          ) : null}
          {resource ? <p className="text-foreground">{resource}</p> : null}
          <p className="flex items-center gap-1.5">
            <User className="size-3.5 shrink-0" />
            {listing.ownerName}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:min-h-10 sm:w-auto sm:flex-1"
            onClick={onDetails}
          >
            Подробнее
          </Button>
          {!isOwn ? (
            <Button
              type="button"
              className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10 sm:w-auto sm:flex-1"
              onClick={onRequest}
            >
              Оставить заявку
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
