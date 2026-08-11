import { LayerGroup, TileLayer } from 'react-leaflet'
import type { MapBasemapConfig } from '@/lib/maps/tiles'

type BasemapTileLayersProps = {
  basemap: MapBasemapConfig
  onTileError?: () => void
}

/** Base imagery + optional label/road overlays (hybrid). */
export function BasemapTileLayers({ basemap, onTileError }: BasemapTileLayersProps) {
  const overlays = basemap.overlays ?? []
  const tileEvents = onTileError ? { tileerror: onTileError } : undefined

  if (overlays.length === 0) {
    return (
      <TileLayer
        url={basemap.url}
        attribution={basemap.attribution}
        maxZoom={basemap.maxZoom ?? 19}
        eventHandlers={tileEvents}
      />
    )
  }

  return (
    <LayerGroup>
      <TileLayer
        url={basemap.url}
        attribution={basemap.attribution}
        maxZoom={basemap.maxZoom ?? 19}
        eventHandlers={tileEvents}
      />
      {overlays.map((overlay) => (
        <TileLayer
          key={overlay.url}
          url={overlay.url}
          attribution={overlay.attribution}
          opacity={overlay.opacity ?? 1}
          maxZoom={basemap.maxZoom ?? 19}
          eventHandlers={tileEvents}
        />
      ))}
    </LayerGroup>
  )
}
