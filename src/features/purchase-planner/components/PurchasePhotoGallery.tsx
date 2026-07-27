import { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'

type PurchasePhotoGalleryProps = {
  images: string[]
  title?: string
  className?: string
  thumbClassName?: string
}

export function PurchasePhotoGallery({
  images,
  title = 'Фото закупки',
  className,
  thumbClassName,
}: PurchasePhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  if (images.length === 0) return null

  const slides = images.map((src) => ({ src: mediaUrl(src) }))

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {images.map((url, index) => (
          <button
            key={url}
            type="button"
            className={cn(
              'overflow-hidden rounded-md border border-border',
              thumbClassName ?? 'size-14 sm:size-16',
            )}
            onClick={() => {
              setActiveIndex(index)
              setLightboxOpen(true)
            }}
            aria-label={`${title} ${index + 1}`}
          >
            <img
              src={mediaUrl(url)}
              alt=""
              className="size-full object-cover"
            />
          </button>
        ))}
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
