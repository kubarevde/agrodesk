import { type ReactNode, useMemo } from 'react'
import L from 'leaflet'
import {
  AttributionControl,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
} from 'react-leaflet'
import { cn } from '@/lib/utils'

// Swap later via VITE_MAP_TILES_URL (MapTiler, other OSM-compatible providers).
const TILE_URL =
  import.meta.env.VITE_MAP_TILES_URL ??
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const TILE_ATTRIBUTION =
  'Данные карт © OpenStreetMap contributors, лицензия ODbL'

export type MapMarkerColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

export type MapMarker = {
  id: string
  lat: number
  lng: number
  label: string
  sublabel?: string
  popupContent?: ReactNode
  color?: MapMarkerColor
  onClick?: () => void
}

export type MapPolygon = {
  id: string
  coordinates: number[][]
  color?: string
  fillColor?: string
  label?: string
  onClick?: () => void
}

type MapViewProps = {
  center?: [number, number]
  zoom?: number
  height?: string
  className?: string
  markers?: MapMarker[]
  polygons?: MapPolygon[]
}

const MARKER_COLORS: Record<MapMarkerColor, string> = {
  green: 'var(--success)',
  yellow: '#CA8A04',
  red: 'var(--destructive)',
  blue: 'var(--primary)',
  gray: 'var(--muted-foreground)',
}

function createColoredIcon(color: MapMarkerColor = 'blue') {
  const fill = MARKER_COLORS[color]
  return L.divIcon({
    className: 'agrodesk-map-marker',
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${fill};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  })
}

export function MapView({
  center = [51.5, 36.5],
  zoom = 10,
  height = '400px',
  className,
  markers = [],
  polygons = [],
}: MapViewProps) {
  const icons = useMemo(() => {
    const map = new Map<MapMarkerColor, L.DivIcon>()
    for (const color of Object.keys(MARKER_COLORS) as MapMarkerColor[]) {
      map.set(color, createColoredIcon(color))
    }
    return map
  }, [])

  return (
    <div
      className={cn('w-full overflow-hidden rounded-lg border border-border', className)}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom
        attributionControl={false}
      >
        <AttributionControl position="bottomright" prefix={false} />
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={icons.get(marker.color ?? 'blue')}
            eventHandlers={marker.onClick ? { click: marker.onClick } : undefined}
          >
            <Tooltip sticky>
              {[marker.label, marker.sublabel].filter(Boolean).join(' · ')}
            </Tooltip>
            <Popup>
              {marker.popupContent ?? (
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{marker.label}</p>
                  {marker.sublabel ? (
                    <p className="text-xs text-muted-foreground">{marker.sublabel}</p>
                  ) : null}
                </div>
              )}
            </Popup>
          </Marker>
        ))}

        {polygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            positions={polygon.coordinates as [number, number][]}
            pathOptions={{
              color: polygon.color ?? 'var(--primary)',
              fillColor: polygon.fillColor ?? polygon.color ?? 'var(--primary)',
              fillOpacity: 0.25,
              weight: 2,
            }}
            eventHandlers={polygon.onClick ? { click: polygon.onClick } : undefined}
          >
            {polygon.label ? <Tooltip sticky>{polygon.label}</Tooltip> : null}
          </Polygon>
        ))}
      </MapContainer>
    </div>
  )
}
