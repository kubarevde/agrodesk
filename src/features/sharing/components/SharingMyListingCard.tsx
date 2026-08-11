import { Archive, ChevronDown, ChevronUp, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type SyntheticEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import { useFields } from '@/features/fields/hooks'
import { mediaUrl } from '@/lib/media'
import {
  useDeleteSharingListing,
  useIncomingSharingRequests,
  useUpdateSharingListingStatus,
} from '../hooks'
import type { SharingListing } from '../types'
import { SCOPE_LABELS, STATUS_LABELS } from '../types'
import {
  formatListingPrice,
  isArchivedListing,
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
  const suppressNavRef = useRef(false)
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
  const archived = isArchivedListing(listing)

  const openDetails = () => {
    if (suppressNavRef.current) return
    onDetails(listing)
  }

  const stopCardNav = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  const actions = useMemo((): CardActionItem[] => {
    if (archived) {
      return [
        {
          id: 'restore',
          label: 'Восстановить',
          icon: Play,
          onSelect: () => updateStatus.mutate({ id: listing.id, status: 'active' }),
        },
      ]
    }
    return [
      {
        id: 'edit',
        label: 'Редактировать',
        icon: Pencil,
        onSelect: () => onEdit(listing),
      },
      {
        id: 'toggle',
        label: listing.status === 'active' ? 'Приостановить' : 'Активировать',
        icon: listing.status === 'active' ? Pause : Play,
        onSelect: () =>
          updateStatus.mutate({
            id: listing.id,
            status: listing.status === 'active' ? 'paused' : 'active',
          }),
      },
      {
        id: 'archive',
        label: 'Удалить',
        icon: Trash2,
        variant: 'destructive',
        // Soft-archive (13.1) — DELETE sets status=archived, not done.
        onSelect: () => deleteListing.mutate(listing.id),
      },
    ]
  }, [archived, deleteListing, listing, onEdit, updateStatus])

  return (
    <Card
      className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:border-primary/40"
      data-testid="sharing-my-listing-card"
      role="link"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetails()
        }
      }}
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
          <Archive className="size-7 opacity-50 sm:size-8" />
        </div>
      )}

      <CardHeader className="space-y-2 p-3 pb-2 sm:p-4 sm:pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 text-base font-semibold leading-snug break-words text-foreground sm:text-lg">
            {listing.title}
          </CardTitle>
          <div onClick={stopCardNav} onKeyDown={stopCardNav}>
            <CardActionsMenu
              actions={actions}
              title={listing.title}
              onOpenChange={(menuOpen) => {
                if (!menuOpen) {
                  suppressNavRef.current = true
                  window.setTimeout(() => {
                    suppressNavRef.current = false
                  }, 400)
                }
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{typeBadgeLabel(listing.type)}</Badge>
          {listing.type === 'field' ? (
            <Badge variant="outline">{SCOPE_LABELS[listing.sharingScope]}</Badge>
          ) : null}
          <Badge variant="secondary">{STATUS_LABELS[listing.status] ?? listing.status}</Badge>
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
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-3 pt-0 sm:p-4 sm:pt-0">
        {listing.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
        ) : null}
        <p className="text-base font-medium tabular-nums text-foreground">
          {formatListingPrice(listing)}
        </p>
        {resourceLabel(listing, field) ? (
          <p className="text-sm text-foreground">{resourceLabel(listing, field)}</p>
        ) : null}

        <div
          className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          onClick={stopCardNav}
          onKeyDown={stopCardNav}
        >
          {archived ? (
            <Button
              type="button"
              className="min-h-11 w-full sm:min-h-10 sm:w-auto sm:flex-1"
              disabled={pending}
              onClick={() => updateStatus.mutate({ id: listing.id, status: 'active' })}
            >
              Восстановить
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full sm:min-h-10 sm:w-auto"
            onClick={() => setExpanded((value) => !value)}
          >
            Заявки
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
        </div>

        {expanded ? (
          <div
            className="space-y-2 border-t border-border pt-3"
            onClick={stopCardNav}
            onKeyDown={stopCardNav}
          >
            {listingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Заявок пока нет</p>
            ) : (
              listingRequests.map((request) => (
                <SharingRequestRow key={request.id} request={request} showActions={!archived} />
              ))
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
