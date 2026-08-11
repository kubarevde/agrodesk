import { useEffect, useMemo, useState } from 'react'
import {
  MapView,
  type MapMarker,
  type MapPolygon,
} from '@/components/shared/MapView'
import type { MapBasemapId } from '@/lib/maps/tiles'
import {
  MapLocationSearch,
  type MapFlyTarget,
} from '@/components/shared/MapLocationSearch'
import { cn } from '@/lib/utils'
import { AgroMapOverlayToggles } from './AgroMapOverlayToggles'
import type { AgroMapOverlay } from './types'

type AgroMapProps = {
  overlays: AgroMapOverlay[]
  height?: string
  className?: string
  /** Show place search (Nominatim). Default false. */
  showSearch?: boolean
  /** Toggle overlay groups when 2+. Default true. */
  showOverlayToggles?: boolean
  defaultBasemap?: MapBasemapId
  fitToData?: boolean
  showBasemapControl?: boolean
  center?: [number, number]
  zoom?: number
  /** Fill parent height (parent must be a sized flex/absolute box). */
  fill?: boolean
}

function initialVisibility(overlays: AgroMapOverlay[]): Record<string, boolean> {
  const map: Record<string, boolean> = {}
  for (const overlay of overlays) {
    map[overlay.id] = overlay.defaultVisible !== false
  }
  return map
}

function resolveCenter(
  markers: MapMarker[],
  polygons: MapPolygon[],
  fallback: [number, number] = [51.5, 36.5],
): [number, number] {
  if (markers[0]) return [markers[0].lat, markers[0].lng]
  const first = polygons[0]?.coordinates[0]
  if (first && first.length >= 2) return [first[0], first[1]]
  return fallback
}

/**
 * Composition layer over MapView: toggleable overlays + optional place search.
 * Single Leaflet engine — do not add a second map stack.
 */
export function AgroMap({
  overlays,
  height = 'min(70vh, 600px)',
  className,
  showSearch = false,
  showOverlayToggles = true,
  defaultBasemap = 'satellite',
  fitToData = true,
  showBasemapControl = true,
  center,
  zoom = 11,
  fill = false,
}: AgroMapProps) {
  const [flyTo, setFlyTo] = useState<MapFlyTarget | null>(null)
  const [visibility, setVisibility] = useState(() => initialVisibility(overlays))

  const overlayKey = overlays.map((o) => o.id).join('|')

  useEffect(() => {
    setVisibility((prev) => {
      const next = initialVisibility(overlays)
      for (const id of Object.keys(next)) {
        if (id in prev) next[id] = prev[id]
      }
      return next
    })
    // Sync when overlay id set changes; content updates keep user toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- overlayKey
  }, [overlayKey])

  const { markers, polygons } = useMemo(() => {
    const nextMarkers: MapMarker[] = []
    const nextPolygons: MapPolygon[] = []
    for (const overlay of overlays) {
      if (visibility[overlay.id] === false) continue
      if (overlay.markers) nextMarkers.push(...overlay.markers)
      if (overlay.polygons) nextPolygons.push(...overlay.polygons)
    }
    return { markers: nextMarkers, polygons: nextPolygons }
  }, [overlays, visibility])

  const mapCenter = center ?? resolveCenter(markers, polygons)

  return (
    <div
      className={cn(
        fill ? 'flex h-full min-h-0 flex-col gap-3' : 'space-y-3',
      )}
    >
      {showSearch ? (
        <MapLocationSearch
          className="max-w-xl shrink-0"
          onSelect={setFlyTo}
          hint=""
          placeholder="Населённый пункт, адрес или lat, lng"
        />
      ) : null}

      {showOverlayToggles ? (
        <div className="shrink-0">
          <AgroMapOverlayToggles
            overlays={overlays}
            visibility={visibility}
            onToggle={(id) =>
              setVisibility((prev) => ({ ...prev, [id]: prev[id] === false }))
            }
          />
        </div>
      ) : null}

      <MapView
        height={fill ? '100%' : height}
        className={cn(
          fill ? 'min-h-0 flex-1' : 'min-h-[280px]',
          className,
        )}
        center={mapCenter}
        zoom={zoom}
        markers={markers}
        polygons={polygons}
        defaultBasemap={defaultBasemap}
        fitToData={fitToData}
        showBasemapControl={showBasemapControl}
        flyTo={flyTo}
      />
    </div>
  )
}
