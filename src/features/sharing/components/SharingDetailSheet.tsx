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
import { useIsMobile } from '@/hooks/useMediaQuery'
import { mediaUrl } from '@/lib/media'
import { regionLabel } from '@/lib/regions.ru'
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
  const isMobile = useIsMobile(639)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)

  const isOwn = Boolean(listing && user && listing.ownerId === user.id)
  const accepted = useMemo(
    () =>
      Boolean(
        listing &&
          outgoing.some(
            (item) => item.listingId === listing.id && item.status === 'accepted',
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
  const showContact = isOwn || accepted

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          showCloseButton
          className={
            isMobile
              ? 'flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0'
              : 'flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg'
          }
        >
          <SheetHeader className="shrink-0 space-y-2 border-b border-border px-4 py-4 pr-14 text-left sm:pr-12">
            <SheetTitle className="text-lg leading-snug break-words sm:text-xl">
              {listing.title}
            </SheetTitle>
            <SheetDescription className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{typeBadgeLabel(listing.type)}</Badge>
              <Badge variant="secondary">{STATUS_LABELS[listing.status]}</Badge>
              {listing.region ? (
                <Badge variant="outline">{regionLabel(listing.region)}</Badge>
              ) : null}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {listing.images.length > 0 ? (
              <button
                type="button"
                className="block w-full overflow-hidden rounded-lg border border-border"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={mediaUrl(listing.images[0])}
                  alt={listing.title}
                  className="aspect-video max-h-52 w-full object-cover sm:max-h-56"
                />
              </button>
            ) : null}

            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatListingPrice(listing)}
            </p>

            {listing.description ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Описание
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                  {listing.description}
                </p>
              </div>
            ) : null}

            <SharingResourceBlock listing={listing} />

            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm sm:p-4">
              <p className="mb-1 font-medium text-foreground">Контакты</p>
              {showContact ? (
                <p className="break-words text-foreground">
                  {isOwn
                    ? listing.contactInfo || 'Контакт не указан'
                    : acceptedContact || 'Контакт не указан владельцем'}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Контакты доступны после принятия заявки
                </p>
              )}
            </div>

            {!isOwn && listing.status === 'active' ? (
              <Button
                type="button"
                className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10"
                onClick={() => setRequestOpen(true)}
              >
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
