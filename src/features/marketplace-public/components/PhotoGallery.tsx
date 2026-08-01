import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const list = photos.filter((p) => p.trim())
  const [index, setIndex] = useState(0)
  const current = list[index] ?? null

  if (!current) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted text-muted-foreground sm:aspect-[5/4]">
        <ImageOff className="size-10" aria-hidden />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg bg-muted">
        <img
          src={current}
          alt={title}
          className="aspect-[4/3] w-full object-cover sm:aspect-[5/4]"
        />
      </div>
      {list.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'size-14 shrink-0 overflow-hidden rounded-md border-2',
                i === index ? 'border-primary' : 'border-transparent opacity-80',
              )}
              aria-label={`Фото ${i + 1}`}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
