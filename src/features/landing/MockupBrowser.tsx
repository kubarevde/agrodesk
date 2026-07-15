import { useState } from 'react'
import { cn } from '@/lib/utils'

type MockupBrowserProps = {
  src?: string
  alt: string
  placeholderLabel: string
  className?: string
}

export function MockupBrowser({ src, alt, placeholderLabel, className }: MockupBrowserProps) {
  const [failed, setFailed] = useState(!src)

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-green-100 bg-white shadow-lg',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-green-100 bg-green-50/80 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400/70" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-[var(--landing-primary,#16a34a)]/70" />
        <div className="ml-2 h-5 flex-1 rounded-md bg-white px-2 text-[11px] leading-5 text-[var(--landing-muted,#6b7280)]">
          app.agrodesk.ru/dashboard
        </div>
      </div>
      <div className="aspect-[16/10] bg-green-50">
        {!failed && src ? (
          <img
            src={src}
            alt={alt}
            className="size-full object-cover object-top"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-green-50 text-sm text-[var(--landing-muted,#6b7280)]">
            {placeholderLabel}
          </div>
        )}
      </div>
    </div>
  )
}
