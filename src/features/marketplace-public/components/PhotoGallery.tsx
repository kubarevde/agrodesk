import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const list = photos.filter((p) => p.trim())
  const [index, setIndex] = useState(0)
  const current = list[index] ?? null

  if (!current) {
    return (
      <div
        className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted text-muted-foreground sm:aspect-[5/4]"
        data-testid="photo-gallery-empty"
      >
        <ImageOff className="size-10" aria-hidden />
        <p className="text-sm">Фото не загружено</p>
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="photo-gallery">
      <div className="overflow-hidden rounded-xl border border-border bg-muted lg:sticky lg:top-16">
        <img
          src={current}
          alt={title}
          className="aspect-[4/3] w-full object-cover sm:aspect-[5/4]"
          decoding="async"
        />
      </div>
      {list.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'size-14 shrink-0 overflow-hidden rounded-lg border-2 sm:size-16',
                i === index ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100',
              )}
              aria-label={`Фото ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
            >
              <img src={src} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
