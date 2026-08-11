import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AttributionControl,
  FeatureGroup,
  LayersControl,
  MapContainer,
  Polygon,
  useMap,
} from 'react-leaflet'
import { BasemapTileLayers } from '@/components/shared/BasemapTileLayers'
import { polygonContainsPolygon } from '@/lib/maps/geo'
import { getBasemaps, getDefaultBasemapId } from '@/lib/maps/tiles'
import '@/lib/maps/setup'
import {
  normalizePolygon,
  polygonAreaHa,
  polygonCentroid,
  type LatLngPair,
} from '@/features/fields/geometry'
import {
  ContourDrawEngine,
  ContourDrawToolbar,
  type ContourDrawApi,
  type ContourMode,
} from '@/features/fields/components/ContourDrawControls'

const MIN_AREA_HA = 0.01
const FIELD_COLOR = '#7A7974'
const PLOT_COLOR = '#01696F'

type SharingPartialFieldMapProps = {
  fieldPolygon: number[][] | null | undefined
  sharedPolygon: number[][] | null | undefined
  onChange: (polygon: LatLngPair[] | null) => void
  flushRef?: React.MutableRefObject<(() => LatLngPair[] | null) | null>
}

function FitFieldBounds({ polygon }: { polygon: LatLngPair[] | null }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current || !polygon || polygon.length < 3) return
    fitted.current = true
    const bounds = L.latLngBounds(polygon.map(([lat, lng]) => L.latLng(lat, lng)))
    if (!bounds.isValid()) return
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 })
  }, [map, polygon])

  return null
}

export function SharingPartialFieldMap({
  fieldPolygon,
  sharedPolygon,
  onChange,
  flushRef,
}: SharingPartialFieldMapProps) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const drawApiRef = useRef<ContourDrawApi | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [mode, setMode] = useState<ContourMode>('idle')

  const fieldRing = useMemo(() => normalizePolygon(fieldPolygon ?? null), [fieldPolygon])
  const plotRing = useMemo(() => normalizePolygon(sharedPolygon ?? null), [sharedPolygon])
  const basemaps = useMemo(() => getBasemaps(), [])
  const defaultBasemapId = getDefaultBasemapId()

  const center = useMemo((): [number, number] => {
    if (fieldRing) return polygonCentroid(fieldRing)
    if (plotRing) return polygonCentroid(plotRing)
    return [51.5, 36.5]
  }, [fieldRing, plotRing])

  useEffect(() => {
    if (!flushRef) return
    flushRef.current = () => drawApiRef.current?.flush() ?? null
    return () => {
      flushRef.current = null
    }
  }, [flushRef])

  const outside =
    Boolean(fieldRing && plotRing && !polygonContainsPolygon(fieldRing, plotRing))
  const areaHa = plotRing ? polygonAreaHa(plotRing) : null
  const tooSmall = areaHa != null && areaHa < MIN_AREA_HA

  if (!fieldRing) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
        У выбранного поля нет контура. Сначала задайте границы поля в разделе «Поля», затем
        вернитесь к объявлению.
      </p>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-sm font-medium text-foreground">Участок для шеринга</p>
      <p className="text-xs text-muted-foreground">
        Серым показан контур исходного поля (не редактируется). Нарисуйте один полигон участка
        внутри границ поля.
      </p>

      <ContourDrawToolbar
        apiRef={drawApiRef}
        mode={mode}
        hasContour={Boolean(plotRing)}
      />

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <MapContainer
          center={center}
          zoom={14}
          className="z-0 h-[260px] w-full touch-pan-y sm:h-[300px]"
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
          <FitFieldBounds polygon={fieldRing} />
          <Polygon
            positions={fieldRing}
            pathOptions={{
              color: FIELD_COLOR,
              fillColor: FIELD_COLOR,
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '6 4',
            }}
          />
          <FeatureGroup
            ref={(instance) => {
              featureGroupRef.current = instance
            }}
          >
            <ContourDrawEngine
              featureGroupRef={featureGroupRef}
              apiRef={drawApiRef}
              polygon={plotRing}
              pathColor={PLOT_COLOR}
              onChange={(next) => onChangeRef.current(next.polygon)}
              onModeChange={setMode}
            />
          </FeatureGroup>
        </MapContainer>
      </div>

      {areaHa != null ? (
        <p className="text-sm text-foreground">
          Площадь участка для шеринга: {areaHa.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}{' '}
          га
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Участок ещё не нарисован</p>
      )}
      {outside ? (
        <p className="text-sm text-destructive">
          Участок должен полностью находиться внутри границ выбранного поля
        </p>
      ) : null}
      {tooSmall ? (
        <p className="text-sm text-destructive">
          Площадь участка слишком мала (минимум {MIN_AREA_HA} га)
        </p>
      ) : null}
    </div>
  )
}
