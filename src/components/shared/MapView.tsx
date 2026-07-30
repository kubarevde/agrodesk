import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import {
  AttributionControl,
  LayersControl,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import { cn } from '@/lib/utils'
import '@/lib/maps/setup'
import {
  getBasemaps,
  getDefaultBasemapId,
  type MapBasemapId,
} from '@/lib/maps/tiles'

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
  /** Default basemap; env VITE_MAP_DEFAULT_BASEMAP overrides when omitted. */
  defaultBasemap?: MapBasemapId
  /** Fit map to markers/polygons when data is present. */
  fitToData?: boolean
  /** Show schema/satellite layer switcher (default true). */
  showBasemapControl?: boolean
  /** Optional one-shot fly/fit from place search. */
  flyTo?: {
    lat: number
    lng: number
    zoom: number
    bbox?: [number, number, number, number]
  } | null
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

function FitToData({
  markers,
  polygons,
}: {
  markers: MapMarker[]
  polygons: MapPolygon[]
}) {
  const map = useMap()

  useEffect(() => {
    const points: L.LatLngExpression[] = []
    for (const marker of markers) {
      if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) continue
      points.push([marker.lat, marker.lng])
    }
    for (const polygon of polygons) {
      for (const pair of polygon.coordinates) {
        if (
          pair.length >= 2 &&
          Number.isFinite(pair[0]) &&
          Number.isFinite(pair[1])
        ) {
          points.push([pair[0], pair[1]])
        }
      }
    }
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 14))
      return
    }
    const bounds = L.latLngBounds(points)
    if (!bounds.isValid()) return
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 })
  }, [map, markers, polygons])

  return null
}

function FlyToPlace({
  target,
}: {
  target: NonNullable<MapViewProps['flyTo']> | null | undefined
}) {
  const map = useMap()
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    if (!target) return
    const key = `${target.lat},${target.lng},${target.zoom},${target.bbox?.join(',') ?? ''}`
    if (lastKey.current === key) return
    lastKey.current = key
    if (target.bbox) {
      const [south, north, west, east] = target.bbox
      map.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { padding: [28, 28], maxZoom: 16 },
      )
      return
    }
    map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.55 })
  }, [map, target])

  return null
}

export function MapView({
  center = [51.5, 36.5],
  zoom = 10,
  height = '400px',
  className,
  markers = [],
  polygons = [],
  defaultBasemap,
  fitToData = false,
  showBasemapControl = true,
  flyTo = null,
}: MapViewProps) {
  const [tileError, setTileError] = useState(false)
  const basemaps = useMemo(() => getBasemaps(), [])
  const activeDefault = defaultBasemap ?? getDefaultBasemapId()

  const icons = useMemo(() => {
    const map = new Map<MapMarkerColor, L.DivIcon>()
    for (const color of Object.keys(MARKER_COLORS) as MapMarkerColor[]) {
      map.set(color, createColoredIcon(color))
    }
    return map
  }, [])

  return (
    <div
      className={cn(
        'relative w-full min-w-0 overflow-hidden rounded-lg border border-border',
        className,
      )}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full touch-pan-y"
        scrollWheelZoom
        attributionControl={false}
      >
        <AttributionControl position="bottomright" prefix={false} />

        {showBasemapControl ? (
          <LayersControl position="topright">
            {basemaps.map((layer) => (
              <LayersControl.BaseLayer
                key={layer.id}
                checked={layer.id === activeDefault}
                name={layer.name}
              >
                <TileLayer
                  url={layer.url}
                  attribution={layer.attribution}
                  maxZoom={layer.maxZoom ?? 19}
                  eventHandlers={{
                    tileerror: () => setTileError(true),
                  }}
                />
              </LayersControl.BaseLayer>
            ))}
          </LayersControl>
        ) : (
          <TileLayer
            url={basemaps.find((b) => b.id === activeDefault)?.url ?? basemaps[0].url}
            attribution={
              basemaps.find((b) => b.id === activeDefault)?.attribution ??
              basemaps[0].attribution
            }
            maxZoom={19}
            eventHandlers={{
              tileerror: () => setTileError(true),
            }}
          />
        )}

        {fitToData ? <FitToData markers={markers} polygons={polygons} /> : null}
        {flyTo ? <FlyToPlace target={flyTo} /> : null}

        {markers
          .filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng))
          .map((marker) => (
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

        {polygons
          .filter(
            (polygon) =>
              polygon.coordinates.length >= 3 &&
              polygon.coordinates.every(
                (pair) =>
                  pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]),
              ),
          )
          .map((polygon) => (
          <Polygon
            key={polygon.id}
            positions={polygon.coordinates as [number, number][]}
            pathOptions={{
              color: polygon.color ?? '#F9F8F5',
              fillColor: polygon.fillColor ?? polygon.color ?? 'var(--primary)',
              fillOpacity: 0.35,
              weight: 2.5,
            }}
            eventHandlers={polygon.onClick ? { click: polygon.onClick } : undefined}
          >
            {polygon.label ? <Tooltip sticky>{polygon.label}</Tooltip> : null}
          </Polygon>
        ))}

        {tileError ? (
          <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-3 bg-background/85 p-4 text-center">
            <p className="text-sm font-medium text-foreground">Не удалось загрузить карту</p>
            <p className="text-xs text-muted-foreground">
              Проверьте сеть или смените подложку (Спутник / Схема). Офлайн тайлы не кэшируются.
            </p>
            <button
              type="button"
              className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-primary hover:bg-muted/30"
              onClick={() => setTileError(false)}
            >
              Скрыть предупреждение
            </button>
          </div>
        ) : null}
      </MapContainer>
    </div>
  )
}
