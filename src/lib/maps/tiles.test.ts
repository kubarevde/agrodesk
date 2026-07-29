import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  getDefaultBasemapId,
  getOsmBasemap,
  getSatelliteBasemap,
} from '@/lib/maps/tiles'

describe('map tiles config', () => {
  const originalEnv = { ...import.meta.env }

  afterEach(() => {
    vi.unstubAllEnvs()
    Object.assign(import.meta.env, originalEnv)
  })

  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to Esri satellite without API key', () => {
    const satellite = getSatelliteBasemap()
    expect(satellite.id).toBe('satellite')
    expect(satellite.url).toContain('World_Imagery')
    expect(satellite.attribution.toLowerCase()).toContain('esri')
    expect(satellite.attribution.toLowerCase()).not.toContain('leaflet')
  })

  it('defaults OSM layer to openstreetmap tiles', () => {
    const osm = getOsmBasemap()
    expect(osm.id).toBe('osm')
    expect(osm.url).toContain('openstreetmap.org')
  })

  it('prefers satellite as default basemap', () => {
    expect(getDefaultBasemapId()).toBe('satellite')
  })
})
