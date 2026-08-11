import { cn } from '@/lib/utils'
import type { AgroMapOverlay } from './types'

type AgroMapOverlayTogglesProps = {
  overlays: AgroMapOverlay[]
  visibility: Record<string, boolean>
  onToggle: (id: string) => void
}

export function AgroMapOverlayToggles({
  overlays,
  visibility,
  onToggle,
}: AgroMapOverlayTogglesProps) {
  if (overlays.length < 2) return null

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Слои карты"
    >
      {overlays.map((overlay) => {
        const active = visibility[overlay.id] !== false
        const count =
          (overlay.markers?.length ?? 0) + (overlay.polygons?.length ?? 0)
        return (
          <button
            key={overlay.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(overlay.id)}
            className={cn(
              'min-h-9 rounded-md border px-3 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/40',
            )}
          >
            {overlay.label}
            {count > 0 ? (
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
