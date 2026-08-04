import { Loader2, MapPin, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  buildMapFlyTarget,
  searchPlaces,
  type GeocodeResult,
} from '@/lib/maps/geocode'
import { cn } from '@/lib/utils'

export type MapFlyTarget = ReturnType<typeof buildMapFlyTarget>

type MapLocationSearchProps = {
  onSelect: (target: MapFlyTarget) => void
  className?: string
  /** Compact hint under the field (default: search-first tip). */
  hint?: string
  placeholder?: string
}

export function MapLocationSearch({
  onSelect,
  className,
  hint = 'Поиск населённого пункта или координат',
  placeholder = 'Населённый пункт, адрес или lat, lng',
}: MapLocationSearchProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    abortRef.current?.abort()
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }
    if (offline) {
      setResults([])
      setLoading(false)
      setError('Поиск недоступен офлайн')
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    const timer = window.setTimeout(() => {
      void searchPlaces(trimmed, { signal: controller.signal, limit: 5 })
        .then((items) => {
          if (controller.signal.aborted) return
          setResults(items)
          setOpen(true)
          if (items.length === 0) setError('Ничего не найдено')
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setResults([])
          setError('Поиск временно недоступен')
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 350)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, offline])

  const pick = (item: GeocodeResult) => {
    setQuery(item.label)
    setOpen(false)
    setResults([])
    onSelect(buildMapFlyTarget(item))
  }

  return (
    <div className={cn('relative space-y-1', className)}>
      <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        Поиск на карте
      </label>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="min-h-11 pr-10"
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Очистить поиск"
            onClick={() => {
              setQuery('')
              setResults([])
              setError(null)
            }}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
        >
          {results.map((item) => (
            <li key={item.id} role="option">
              <button
                type="button"
                className="flex min-h-11 w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
                onClick={() => pick(item)}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="line-clamp-2 text-foreground">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
