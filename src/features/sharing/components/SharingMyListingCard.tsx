import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useFields } from '@/features/fields/hooks'
import { mediaUrl } from '@/lib/media'
import {
  useDeleteSharingListing,
  useIncomingSharingRequests,
  useUpdateSharingListingStatus,
} from '../hooks'
import type { SharingListing } from '../types'
import { STATUS_LABELS } from '../types'
import {
  formatListingPrice,
  requestsBadgeLabel,
  resourceLabel,
  typeBadgeLabel,
} from '../utils'
import { SharingRequestRow } from './SharingRequestActions'

type SharingMyListingCardProps = {
  listing: SharingListing
  onEdit: (listing: SharingListing) => void
  onDetails: (listing: SharingListing) => void
}

export function SharingMyListingCard({
  listing,
  onEdit,
  onDetails,
}: SharingMyListingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { data: fields = [] } = useFields()
  const { data: incoming = [] } = useIncomingSharingRequests()
  const updateStatus = useUpdateSharingListingStatus()
  const deleteListing = useDeleteSharingListing()

  const field = listing.fieldId ? fields.find((item) => item.id === listing.fieldId) : null
  const listingRequests = useMemo(
    () => incoming.filter((item) => item.listingId === listing.id),
    [incoming, listing.id],
  )
  const cover = listing.images[0]
  const pending = updateStatus.isPending || deleteListing.isPending

  const toggleStatus = () => {
    const next = listing.status === 'active' ? 'paused' : 'active'
    updateStatus.mutate({ id: listing.id, status: next })
  }

  return (
    <Card className="overflow-hidden">
      {cover ? (
        <img
          src={mediaUrl(cover)}
          alt={listing.title}
          className="aspect-video max-h-40 w-full object-cover"
        />
      ) : null}

      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{typeBadgeLabel(listing.type)}</Badge>
          <Badge variant="secondary">{STATUS_LABELS[listing.status]}</Badge>
          <Badge
            variant="outline"
            className={
              listing.requestsCount > 0
                ? 'border-primary/30 bg-primary/10 text-primary'
                : undefined
            }
          >
            {requestsBadgeLabel(listing.requestsCount)}
          </Badge>
        </div>

        <h3 className="line-clamp-2 text-base font-semibold text-foreground">{listing.title}</h3>
        {listing.description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{listing.description}</p>
        ) : null}
        <p className="text-sm font-medium text-foreground">{formatListingPrice(listing)}</p>
        {resourceLabel(listing, field) ? (
          <p className="text-sm text-foreground">{resourceLabel(listing, field)}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onDetails(listing)}>
            Подробнее
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(listing)}>
            Редактировать
          </Button>
          {listing.status !== 'done' ? (
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={toggleStatus}>
              {listing.status === 'active' ? 'Приостановить' : 'Активировать'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => deleteListing.mutate(listing.id)}
          >
            Удалить
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((value) => !value)}
          >
            Заявки
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
        </div>

        {expanded ? (
          <div className="space-y-2 border-t border-border pt-3">
            {listingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Заявок пока нет</p>
            ) : (
              listingRequests.map((request) => (
                <SharingRequestRow key={request.id} request={request} showActions />
              ))
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
