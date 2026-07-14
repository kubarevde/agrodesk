import { useMemo, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCurrentUser } from '@/features/auth/hooks'
import { mediaUrl } from '@/lib/media'
import { useOutgoingSharingRequests } from '../hooks'
import type { SharingListing } from '../types'
import { STATUS_LABELS } from '../types'
import { formatListingPrice, typeBadgeLabel } from '../utils'
import { SharingRequestModal } from './SharingRequestModal'
import { SharingResourceBlock } from './SharingResourceBlock'

type SharingDetailSheetProps = {
  listing: SharingListing | null
  open: boolean
  onClose: () => void
}

export function SharingDetailSheet({ listing, open, onClose }: SharingDetailSheetProps) {
  const { data: user } = useCurrentUser()
  const { data: outgoing = [] } = useOutgoingSharingRequests()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)

  const isOwn = Boolean(listing && user && listing.ownerId === user.id)
  const accepted = useMemo(
    () =>
      Boolean(
        listing &&
          outgoing.some(
            (item) =>
              item.listingId === listing.id &&
              item.status === 'accepted',
          ),
      ),
    [listing, outgoing],
  )
  const acceptedContact = useMemo(() => {
    if (!listing) return null
    const request = outgoing.find(
      (item) => item.listingId === listing.id && item.status === 'accepted',
    )
    return request?.listingContactInfo ?? listing.contactInfo
  }, [listing, outgoing])

  if (!listing) return null

  const slides = listing.images.map((src) => ({ src: mediaUrl(src) }))

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{listing.title}</SheetTitle>
            <SheetDescription className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="outline">{typeBadgeLabel(listing.type)}</Badge>
              <Badge variant="secondary">{STATUS_LABELS[listing.status]}</Badge>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-6">
            {listing.images.length > 0 ? (
              <button
                type="button"
                className="block w-full overflow-hidden rounded-lg border border-border"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={mediaUrl(listing.images[0])}
                  alt={listing.title}
                  className="aspect-video max-h-48 w-full object-cover"
                />
              </button>
            ) : null}

            <p className="text-base font-semibold text-foreground">
              {formatListingPrice(listing)}
            </p>

            {listing.description ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">{listing.description}</p>
            ) : null}

            <SharingResourceBlock listing={listing} />

            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="mb-1 font-medium text-foreground">Контакты</p>
              {accepted ? (
                <p className="text-foreground">
                  {acceptedContact || 'Контакт не указан владельцем'}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Контакты доступны после принятия заявки
                </p>
              )}
            </div>

            {!isOwn && listing.status === 'active' ? (
              <Button type="button" className="w-full" onClick={() => setRequestOpen(true)}>
                Оставить заявку
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {slides.length > 0 ? (
        <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={slides} />
      ) : null}

      <SharingRequestModal
        open={requestOpen}
        listingId={listing.id}
        listingTitle={listing.title}
        onClose={() => setRequestOpen(false)}
      />
    </>
  )
}
