import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AttributionControl,
  FeatureGroup,
  LayersControl,
  MapContainer,
  Marker,
  useMap,
} from 'react-leaflet'
import { BasemapTileLayers } from '@/components/shared/BasemapTileLayers'
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
  type ContourMode,
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
  /** Called by parent before form submit to flush in-progress edit into RHF. */
  flushRef?: React.MutableRefObject<(() => LatLngPair[] | null | void) | null>
}

const DEFAULT_CENTER: [number, number] = [51.5, 36.5]

/** Fit once when opening a field that already has a contour — not after draw/edit. */
function FitInitialBounds({ polygon }: { polygon: LatLngPair[] | null }) {
  const map = useMap()
  const initialPolygon = useRef(polygon)
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current) return
    const poly = initialPolygon.current
    if (!poly || poly.length < 3) return
    fitted.current = true
    const bounds = L.latLngBounds(poly.map(([lat, lng]) => L.latLng(lat, lng)))
    if (!bounds.isValid()) return
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 })
  }, [map])

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
  flushRef,
}: FieldContourEditorProps) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const drawApiRef = useRef<ContourDrawApi | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [flyTarget, setFlyTarget] = useState<MapFlyTarget | null>(null)
  const [mode, setMode] = useState<ContourMode>('idle')

  const normalized = useMemo(() => normalizePolygon(polygon ?? null), [polygon])
  const basemaps = useMemo(() => getBasemaps(), [])
  const defaultBasemapId = getDefaultBasemapId()

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

  useEffect(() => {
    if (!flushRef) return
    flushRef.current = () => drawApiRef.current?.flush()
    return () => {
      flushRef.current = null
    }
  }, [flushRef])

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
          Найдите своё поле на карте, нажмите «Начать рисовать», поставьте точки по границе поля
          (не меньше трёх) и нажмите «Завершить». Чтобы поправить уже нарисованный контур —
          «Изменить контур» (двигайте углы), затем «Готово».
        </p>
      </div>

      <MapLocationSearch
        onSelect={setFlyTarget}
        hint=""
        placeholder="Населённый пункт, адрес или lat, lng"
      />

      <ContourDrawToolbar
        apiRef={drawApiRef}
        mode={mode}
        hasContour={Boolean(normalized)}
      />

      <div className="agrodesk-contour-map overflow-hidden rounded-md border border-border bg-card">
        <MapContainer
          center={initialCenter}
          zoom={normalized || safeWeather ? 14 : 11}
          className="z-0 h-[280px] w-full touch-pan-y sm:h-[320px]"
          scrollWheelZoom
          attributionControl={false}
        >
          <AttributionControl position="bottomright" prefix={false} />
          <LayersControl position="topright">
            {basemaps.map((layer) => (
              <LayersControl.BaseLayer
                key={layer.id}
                checked={layer.id === defaultBasemapId}
                name={layer.name}
              >
                <BasemapTileLayers basemap={layer} />
              </LayersControl.BaseLayer>
            ))}
          </LayersControl>
          <FlyToPlace target={flyTarget} />
          <FitInitialBounds polygon={normalized} />
          <FeatureGroup
            ref={(instance) => {
              featureGroupRef.current = instance
            }}
          >
            <ContourDrawEngine
              featureGroupRef={featureGroupRef}
              apiRef={drawApiRef}
              polygon={normalized}
              onChange={stableOnChange}
              onModeChange={setMode}
            />
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
