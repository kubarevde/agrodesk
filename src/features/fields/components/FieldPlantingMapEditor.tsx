import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FeatureGroup, MapContainer, Polygon, Tooltip, useMap } from 'react-leaflet'
import { BasemapTileLayers } from '@/components/shared/BasemapTileLayers'
import { getBasemaps, getDefaultBasemapId } from '@/lib/maps/tiles'
import '@/lib/maps/setup'
import { normalizePolygon, polygonAreaHa, type LatLngPair } from '../geometry'
import { normalizePlantingMapColor, plantingColorSwatchClass } from '../plantingColors'
import type { FieldPlanting } from '../plantingTypes'
import { formatAreaHa } from '../plantingTypes'
import {
  ContourDrawEngine,
  ContourDrawToolbar,
  type ContourDrawApi,
  type ContourMode,
} from './ContourDrawControls'

type FieldPlantingMapEditorProps = {
  fieldPolygon: number[][]
  value: number[][] | null
  pathColor?: string
  /** Other plantings already on this field (shown read-only). */
  otherPlantings?: FieldPlanting[]
  geometryError?: string | null
  onChange: (polygon: number[][] | null, meta?: { areaHa: number | null }) => void
}

function FitField({ polygon }: { polygon: LatLngPair[] }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds(polygon.map(([lat, lng]) => L.latLng(lat, lng)))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 })
  }, [map, polygon])
  return null
}

function plantingCaption(row: FieldPlanting): string {
  const crop = row.cropName || row.cropCode
  const variety = row.varietyName ? ` · ${row.varietyName}` : ''
  return `${crop}${variety} · ${formatAreaHa(row.areaHa)}`
}

/** Draw planting contour over the field — same map height as field create form. */
export function FieldPlantingMapEditor({
  fieldPolygon,
  value,
  pathColor = '#01696F',
  otherPlantings = [],
  geometryError = null,
  onChange,
}: FieldPlantingMapEditorProps) {
  const fieldRing = useMemo(() => {
    const normalized = normalizePolygon(fieldPolygon)
    return normalized ?? []
  }, [fieldPolygon])
  const planting = useMemo(() => normalizePolygon(value), [value])
  const calculatedArea = planting ? polygonAreaHa(planting) : null
  const siblings = useMemo(
    () => otherPlantings.filter((row) => row.status !== 'cancelled'),
    [otherPlantings],
  )
  const siblingsOnMap = useMemo(
    () => siblings.filter((row) => row.polygon && row.polygon.length >= 3),
    [siblings],
  )
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const drawApiRef = useRef<ContourDrawApi | null>(null)
  const [mode, setMode] = useState<ContourMode>('idle')
  const center = (fieldRing[0] ?? [51.5, 36.5]) as LatLngPair
  const basemap = getBasemaps().find((b) => b.id === getDefaultBasemapId()) ?? getBasemaps()[0]

  return (
    <div className="space-y-2 overflow-hidden rounded-lg border border-border">
      <div className="p-2">
        <ContourDrawToolbar
          apiRef={drawApiRef}
          mode={mode}
          hasContour={Boolean(planting)}
        />
      </div>
      {siblings.length > 0 ? (
        <ul className="space-y-1 px-2 text-xs text-muted-foreground">
          <li className="font-medium text-foreground">Уже добавлено на поле:</li>
          {siblings.map((row) => (
            <li key={row.id} className="flex items-center gap-2">
              <span
                className={`inline-block size-2.5 shrink-0 rounded-full ${plantingColorSwatchClass(row.mapColor)}`}
                aria-hidden
              />
              {plantingCaption(row)}
              {!row.polygon || row.polygon.length < 3 ? (
                <span className="text-muted-foreground">(без контура)</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="agrodesk-contour-map overflow-hidden border-y border-border bg-card">
        <MapContainer
          center={center}
          zoom={14}
          className="z-0 h-[280px] w-full touch-pan-y sm:h-[320px]"
          scrollWheelZoom
          attributionControl={false}
        >
          {basemap ? <BasemapTileLayers basemap={basemap} /> : null}
          <FitField polygon={fieldRing} />
          {fieldRing.length >= 3 ? (
            <Polygon
              positions={fieldRing}
              pathOptions={{
                color: '#7A7974',
                weight: 2,
                fillColor: '#7A7974',
                fillOpacity: 0.12,
                dashArray: '4 4',
              }}
            />
          ) : null}
          {siblingsOnMap.map((row) => {
            const ring = normalizePolygon(row.polygon)
            if (!ring) return null
            const color = normalizePlantingMapColor(row.mapColor)
            return (
              <Polygon
                key={row.id}
                positions={ring}
                pathOptions={{ color, fillColor: color, weight: 2, fillOpacity: 0.35 }}
              >
                <Tooltip sticky>{plantingCaption(row)}</Tooltip>
              </Polygon>
            )
          })}
          <FeatureGroup
            ref={(instance) => {
              featureGroupRef.current = instance
            }}
          >
            <ContourDrawEngine
              featureGroupRef={featureGroupRef}
              apiRef={drawApiRef}
              polygon={planting}
              pathColor={pathColor}
              onModeChange={setMode}
              onChange={(next) => {
                const areaHa = next.polygon ? polygonAreaHa(next.polygon) : null
                onChange(next.polygon, { areaHa })
              }}
            />
          </FeatureGroup>
        </MapContainer>
      </div>
      <div className="space-y-1 px-2 pb-2 text-xs">
        {calculatedArea != null && calculatedArea > 0 ? (
          <p className="font-medium text-foreground">
            Площадь контура: {formatAreaHa(calculatedArea)}
          </p>
        ) : null}
        <p className="text-muted-foreground">
          Контур должен полностью находиться внутри поля и не пересекаться с другими
          культурами.
        </p>
        {geometryError ? (
          <p className="text-destructive" role="alert">
            {geometryError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
