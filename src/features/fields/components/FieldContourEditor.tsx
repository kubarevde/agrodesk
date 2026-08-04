import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AttributionControl,
  FeatureGroup,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  useMap,
} from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { getBasemaps, getDefaultBasemapId } from '@/lib/maps/tiles'
import '@/lib/maps/setup'
import {
  isValidLatLng,
  normalizePolygon,
  polygonAreaHa,
  polygonCentroid,
  type LatLngPair,
} from '../geometry'
import {
  ContourDrawEngine,
  ContourDrawToolbar,
  type ContourDrawApi,
} from './ContourDrawControls'
import { MapLocationSearch, type MapFlyTarget } from './MapLocationSearch'

type ContourChange = {
  polygon: LatLngPair[] | null
  syncWeatherPoint: boolean
  latitude?: number
  longitude?: number
  areaHa?: number
}

type FieldContourEditorProps = {
  polygon: number[][] | null | undefined
  weatherLat?: number
  weatherLng?: number
  onChange: (next: ContourChange) => void
}

const DEFAULT_CENTER: [number, number] = [51.5, 36.5]

function FitBounds({ polygon }: { polygon: LatLngPair[] | null }) {
  const map = useMap()
  const fittedKey = useRef<string | null>(null)

  useEffect(() => {
    if (!polygon || polygon.length < 3) return
    const key = polygon.map((p) => p.join(',')).join('|')
    if (fittedKey.current === key) return
    fittedKey.current = key
    const bounds = L.latLngBounds(polygon.map(([lat, lng]) => L.latLng(lat, lng)))
    if (!bounds.isValid()) return
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 })
  }, [map, polygon])

  return null
}

function FlyToPlace({ target }: { target: MapFlyTarget | null }) {
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

export function FieldContourEditor({
  polygon,
  weatherLat,
  weatherLng,
  onChange,
}: FieldContourEditorProps) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const drawApiRef = useRef<ContourDrawApi | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [flyTarget, setFlyTarget] = useState<MapFlyTarget | null>(null)
  const [drawing, setDrawing] = useState(false)

  const normalized = useMemo(() => normalizePolygon(polygon ?? null), [polygon])
  const basemap = useMemo(() => {
    const id = getDefaultBasemapId() || 'satellite'
    return getBasemaps().find((b) => b.id === id) ?? getBasemaps()[0]
  }, [])

  const safeWeather = isValidLatLng(weatherLat, weatherLng)
    ? ([weatherLat, weatherLng] as [number, number])
    : null

  const initialCenter = useMemo((): [number, number] => {
    if (normalized) return polygonCentroid(normalized)
    if (safeWeather) return safeWeather
    return DEFAULT_CENTER
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stableOnChange = useMemo(
    () => (next: ContourChange) => {
      onChangeRef.current(next)
    },
    [],
  )

  const statusText = normalized
    ? `Контур: ${normalized.length} вершин · площадь ≈ ${polygonAreaHa(normalized)} га`
    : safeWeather
      ? 'Задана только погодная точка — контур можно дорисовать'
      : 'Контур не задан'

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Контур</p>
        <p className="text-xs text-muted-foreground">
          Найдите место на карте → «Начать рисовать» → точки по меже (от 3) → «Завершить».
        </p>
      </div>

      <MapLocationSearch onSelect={setFlyTarget} />

      <ContourDrawToolbar
        apiRef={drawApiRef}
        drawing={drawing}
        hasContour={Boolean(normalized)}
      />

      <div className="hidden justify-end sm:flex">
        {normalized ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => drawApiRef.current?.clear()}
          >
            Очистить контур
          </Button>
        ) : null}
      </div>

      <div className="agrodesk-contour-map overflow-hidden rounded-md border border-border bg-card">
        <MapContainer
          center={initialCenter}
          zoom={normalized || safeWeather ? 14 : 11}
          className="z-0 h-[280px] w-full touch-pan-y sm:h-[320px]"
          scrollWheelZoom
          attributionControl={false}
        >
          <AttributionControl position="bottomright" prefix={false} />
          <TileLayer
            url={basemap.url}
            attribution={basemap.attribution}
            maxZoom={basemap.maxZoom}
          />
          <FlyToPlace target={flyTarget} />
          <FitBounds polygon={normalized} />
          <FeatureGroup
            ref={(instance) => {
              featureGroupRef.current = instance
            }}
          >
            <ContourDrawEngine
              featureGroupRef={featureGroupRef}
              apiRef={drawApiRef}
              onChange={stableOnChange}
              onDrawingChange={setDrawing}
            />
            {normalized ? (
              <Polygon
                positions={normalized}
                pathOptions={{
                  color: '#01696F',
                  fillColor: '#01696F',
                  fillOpacity: 0.25,
                  weight: 2,
                }}
              />
            ) : null}
          </FeatureGroup>
          {safeWeather ? <Marker position={safeWeather} /> : null}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">{statusText}</p>
      {safeWeather ? (
        <p className="text-xs text-muted-foreground">
          Погода: {safeWeather[0].toFixed(5)}, {safeWeather[1].toFixed(5)}
        </p>
      ) : null}
    </div>
  )
}
