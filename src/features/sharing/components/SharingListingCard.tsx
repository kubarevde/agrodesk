import { MapPin, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { FieldResponse } from '@/features/fields/types'
import { mediaUrl } from '@/lib/media'
import type { SharingListing } from '../types'
import { STATUS_LABELS } from '../types'
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
    <Card className="flex flex-col overflow-hidden">
      {cover ? (
        <img
          src={mediaUrl(cover)}
          alt={listing.title}
          className="aspect-video max-h-40 w-full object-cover"
        />
      ) : null}

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{typeBadgeLabel(listing.type)}</Badge>
          <Badge variant="secondary">{STATUS_LABELS[listing.status]}</Badge>
        </div>

        <h3 className="line-clamp-2 text-base font-semibold text-foreground">{listing.title}</h3>

        {listing.description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{listing.description}</p>
        ) : null}

        <p className="text-sm font-medium text-foreground">{formatListingPrice(listing)}</p>

        {listing.region ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {listing.region}
          </p>
        ) : null}

        {resource ? <p className="text-sm text-foreground">{resource}</p> : null}

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="size-3.5 shrink-0" />
          {listing.ownerName}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onDetails}>
            Подробнее
          </Button>
          {!isOwn ? (
            <Button type="button" size="sm" onClick={onRequest}>
              Оставить заявку
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
