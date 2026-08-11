import { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'

type PurchasePhotoGalleryProps = {
  images: string[]
  title?: string
  className?: string
  thumbClassName?: string
  /** Cap thumbs in lists; full set still opens in lightbox. */
  maxThumbs?: number
}

export function PurchasePhotoGallery({
  images,
  title = 'Фото закупки',
  className,
  thumbClassName,
  maxThumbs,
}: PurchasePhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  if (images.length === 0) return null

  const visible =
    maxThumbs != null && maxThumbs > 0 ? images.slice(0, maxThumbs) : images
  const hiddenCount = images.length - visible.length
  const slides = images.map((src) => ({ src: mediaUrl(src) }))

  const openAt = (index: number) => {
    setActiveIndex(index)
    setLightboxOpen(true)
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {visible.map((url, index) => (
          <button
            key={url}
            type="button"
            className={cn(
              'overflow-hidden rounded-md border border-border',
              thumbClassName ?? 'size-14 sm:size-16',
            )}
            onClick={(event) => {
              event.stopPropagation()
              openAt(index)
            }}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={`${title} ${index + 1}`}
          >
            <img src={mediaUrl(url)} alt="" className="size-full object-cover" loading="lazy" />
          </button>
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center rounded-md border border-border bg-muted/40 text-xs font-medium text-muted-foreground',
              thumbClassName ?? 'size-14 sm:size-16',
            )}
            onClick={(event) => {
              event.stopPropagation()
              openAt(maxThumbs ?? 0)
            }}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={`Ещё ${hiddenCount} фото`}
          >
            +{hiddenCount}
          </button>
        ) : null}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={activeIndex}
        slides={slides}
      />
    </>
  )
}
