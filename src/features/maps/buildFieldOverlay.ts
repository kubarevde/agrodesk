import type { MapMarker, MapPolygon } from '@/components/shared/MapView'
import type { FieldResponse } from '@/features/fields/types'
import { normalizePlantingMapColor } from '@/features/fields/plantingColors'
import type { SeasonPlantingOverlay } from '@/features/fields/seasonPlantingTypes'
import type { AgroMapOverlay } from './types'

function fieldPointColor(cropType: string | null): MapMarker['color'] {
  if (cropType === 'Пшеница' || cropType === 'Ячмень') return 'yellow'
  if (cropType === 'Подсолнечник' || cropType === 'Рапс') return 'yellow'
  if (cropType === 'Кукуруза' || cropType === 'Озимые') return 'green'
  if (cropType === 'Пар') return 'gray'
  return 'blue'
}

export type BuildFieldOverlayOptions = {
  id?: string
  label?: string
  /** Include weather/centroid pins for contoured fields. Default true. */
  includeWeatherMarkers?: boolean
  /** Only active fields. Default false (caller filters). */
  activeOnly?: boolean
  /** Season plantings to draw as colored sub-polygons on fields. */
  plantings?: SeasonPlantingOverlay[]
}

function plantingLabel(planting: SeasonPlantingOverlay): string {
  const crop = planting.cropName || planting.cropCode
  const variety = planting.varietyName ? ` · ${planting.varietyName}` : ''
  return `${planting.fieldName}: ${crop}${variety} · ${planting.areaHa} га`
}

/** Build field contours + optional planting sub-polygons for AgroMap. */
export function buildFieldOverlay(
  fields: FieldResponse[],
  options: BuildFieldOverlayOptions = {},
): AgroMapOverlay {
  const {
    id = 'fields',
    label = 'Поля',
    includeWeatherMarkers = true,
    activeOnly = false,
    plantings = [],
  } = options

  const markers: MapMarker[] = []
  const polygons: MapPolygon[] = []
  const plantingsByField = new Map<string, SeasonPlantingOverlay[]>()
  for (const planting of plantings) {
    const list = plantingsByField.get(planting.fieldId) ?? []
    list.push(planting)
    plantingsByField.set(planting.fieldId, list)
  }

  for (const field of fields) {
    if (activeOnly && !field.is_active) continue

    const fieldPlantings = plantingsByField.get(field.id) ?? []
    const withPolygons = fieldPlantings.filter(
      (p) => p.polygon && p.polygon.length >= 3,
    )
    const sharing = field.sharing_status === 'active' ? ' · В шеринге' : ''
    const area = field.area_ha != null ? `${field.area_ha} га` : undefined
    const cropSummary =
      fieldPlantings.length > 0
        ? fieldPlantings
            .map((p) => `${p.cropName || p.cropCode}${p.varietyName ? ` (${p.varietyName})` : ''}`)
            .join(', ')
        : null
    const sublabel = [area, cropSummary, sharing.trim() || null].filter(Boolean).join(' · ')

    if (field.polygon && field.polygon.length >= 3) {
      // Base field outline (muted when plantings are drawn).
      polygons.push({
        id: field.id,
        coordinates: field.polygon,
        color: '#01696F',
        fillColor: withPolygons.length > 0 ? '#F9F8F5' : '#7A7974',
        weight: withPolygons.length > 0 ? 2 : undefined,
        fillOpacity: withPolygons.length > 0 ? 0.08 : 0.12,
        label: `${field.name}${sublabel ? ` — ${sublabel}` : ''}`,
      })
      for (const planting of withPolygons) {
        polygons.push({
          id: `planting-${planting.id}`,
          coordinates: planting.polygon ?? [],
          color: normalizePlantingMapColor(planting.mapColor),
          fillColor: normalizePlantingMapColor(planting.mapColor),
          fillOpacity: 0.45,
          weight: 2,
          label: plantingLabel(planting),
        })
      }
      if (
        includeWeatherMarkers &&
        field.latitude != null &&
        field.longitude != null
      ) {
        markers.push({
          id: `${field.id}-weather`,
          lat: field.latitude,
          lng: field.longitude,
          label: `${field.name} · погода`,
          color: 'blue',
        })
      }
      continue
    }

    if (field.latitude != null && field.longitude != null) {
      markers.push({
        id: field.id,
        lat: field.latitude,
        lng: field.longitude,
        label: field.name,
        sublabel: sublabel || undefined,
        color: fieldPlantings[0]
          ? fieldPointColor(fieldPlantings[0].cropName || fieldPlantings[0].cropCode)
          : 'blue',
      })
    }
  }

  return { id, label, defaultVisible: true, markers, polygons }
}
