import L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
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

type ContourChange = {
  polygon: LatLngPair[] | null
  /** When true, also update weather lat/lng from centroid (or clear). */
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

function layerToPairs(layer: L.Layer): LatLngPair[] | null {
  if (!(layer instanceof L.Polygon)) return null
  const raw = layer.getLatLngs()
  const ring = (Array.isArray(raw[0]) ? raw[0] : raw) as L.LatLng[]
  return normalizePolygon(ring.map((ll) => [ll.lat, ll.lng]))
}

function LeafletDrawTools({
  featureGroupRef,
  onChange,
}: {
  featureGroupRef: React.MutableRefObject<L.FeatureGroup | null>
  onChange: FieldContourEditorProps['onChange']
}) {
  const map = useMap()

  useEffect(() => {
    const group = featureGroupRef.current
    if (!group) return

    const control = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: false,
          shapeOptions: {
            color: '#01696F',
            fillColor: '#01696F',
            fillOpacity: 0.25,
            weight: 2,
          },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: group,
        remove: true,
      },
    })
    map.addControl(control)

    const emit = (pairs: LatLngPair[] | null) => {
      if (!pairs) {
        onChange({ polygon: null, syncWeatherPoint: false })
        return
      }
      const [lat, lng] = polygonCentroid(pairs)
      onChange({
        polygon: pairs,
        syncWeatherPoint: true,
        latitude: lat,
        longitude: lng,
        areaHa: polygonAreaHa(pairs),
      })
    }

    const onCreated = (event: L.LeafletEvent) => {
      const created = event as L.DrawEvents.Created
      group.clearLayers()
      group.addLayer(created.layer)
      emit(layerToPairs(created.layer))
    }
    const onEdited = () => {
      let found: LatLngPair[] | null = null
      group.eachLayer((layer) => {
        if (!found) found = layerToPairs(layer)
      })
      emit(found)
    }
    const onDeleted = () => emit(null)

    map.on(L.Draw.Event.CREATED, onCreated)
    map.on(L.Draw.Event.EDITED, onEdited)
    map.on(L.Draw.Event.DELETED, onDeleted)

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated)
      map.off(L.Draw.Event.EDITED, onEdited)
      map.off(L.Draw.Event.DELETED, onDeleted)
      map.removeControl(control)
    }
  }, [map, featureGroupRef, onChange])

  return null
}

export function FieldContourEditor({
  polygon,
  weatherLat,
  weatherLng,
  onChange,
}: FieldContourEditorProps) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const normalized = useMemo(() => normalizePolygon(polygon ?? null), [polygon])
  const basemap = useMemo(() => {
    const id = getDefaultBasemapId() || 'satellite'
    return getBasemaps().find((b) => b.id === id) ?? getBasemaps()[0]
  }, [])

  const safeWeather = isValidLatLng(weatherLat, weatherLng)
    ? ([weatherLat, weatherLng] as [number, number])
    : null

  /** Stable initial center — do not remount MapContainer on each keystroke. */
  const initialCenter = useMemo((): [number, number] => {
    if (normalized) return polygonCentroid(normalized)
    if (safeWeather) return safeWeather
    return DEFAULT_CENTER
    // intentionally only on first mount of this editor instance
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
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">Контур на карте</p>
          <p className="text-xs text-muted-foreground">
            Выберите инструмент многоугольника и поставьте точки по краю участка (не меньше 3).
            Контур замыкается по первой точке.
          </p>
        </div>
        {normalized ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              featureGroupRef.current?.clearLayers()
              stableOnChange({ polygon: null, syncWeatherPoint: false })
            }}
          >
            Очистить контур
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <MapContainer
          center={initialCenter}
          zoom={normalized || safeWeather ? 14 : 11}
          className="z-0 h-[240px] w-full touch-pan-y sm:h-[300px]"
          scrollWheelZoom
          attributionControl={false}
        >
          <AttributionControl position="bottomright" prefix={false} />
          <TileLayer
            url={basemap.url}
            attribution={basemap.attribution}
            maxZoom={basemap.maxZoom}
          />
          <FitBounds polygon={normalized} />
          <FeatureGroup
            ref={(instance) => {
              featureGroupRef.current = instance
            }}
          >
            <LeafletDrawTools featureGroupRef={featureGroupRef} onChange={stableOnChange} />
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
          Погодная точка: {safeWeather[0].toFixed(5)}, {safeWeather[1].toFixed(5)}
          {normalized ? ' (центр контура или ручной ввод)' : ''}
        </p>
      ) : null}
    </div>
  )
}
