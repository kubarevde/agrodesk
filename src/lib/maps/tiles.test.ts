import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  getBasemaps,
  getDefaultBasemapId,
  getHybridBasemap,
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

  it('provides hybrid as satellite + label overlays', () => {
    const hybrid = getHybridBasemap()
    expect(hybrid.id).toBe('hybrid')
    expect(hybrid.name).toBe('Гибрид')
    expect(hybrid.url).toContain('World_Imagery')
    expect(hybrid.overlays?.length).toBeGreaterThanOrEqual(1)
    expect(hybrid.overlays?.[0]?.url).toMatch(/Boundaries_and_Places|Transportation/)
  })

  it('defaults OSM layer to openstreetmap tiles', () => {
    const osm = getOsmBasemap()
    expect(osm.id).toBe('osm')
    expect(osm.url).toContain('openstreetmap.org')
  })

  it('lists satellite, hybrid, osm in that order', () => {
    expect(getBasemaps().map((b) => b.id)).toEqual(['satellite', 'hybrid', 'osm'])
  })

  it('prefers satellite as default basemap', () => {
    expect(getDefaultBasemapId()).toBe('satellite')
  })
})
