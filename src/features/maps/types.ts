import type { MapMarker, MapPolygon } from '@/components/shared/MapView'

/**
 * One toggleable overlay group on AgroMap.
 * Used by fields, equipment, and later locations (8.4) / sharing (13.2).
 */
export type AgroMapOverlay = {
  id: string
  label: string
  /** Shown when overlay toggles are enabled. Default true. */
  defaultVisible?: boolean
  markers?: MapMarker[]
  polygons?: MapPolygon[]
}

export type AgroMapPreset = 'enterprise' | 'equipment' | 'custom'
