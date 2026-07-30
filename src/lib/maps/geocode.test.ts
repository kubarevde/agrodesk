import { describe, expect, it, vi } from 'vitest'
import {
  buildMapFlyTarget,
  geocodeResultZoom,
  parseCoordinateQuery,
  searchPlaces,
} from './geocode'

describe('parseCoordinateQuery', () => {
  it('parses lat,lng pairs', () => {
    const result = parseCoordinateQuery('51.7305, 36.1923')
    expect(result).toEqual({
      id: 'coord:51.7305,36.1923',
      label: '51.73050, 36.19230',
      lat: 51.7305,
      lng: 36.1923,
    })
  })

  it('rejects invalid ranges', () => {
    expect(parseCoordinateQuery('99, 10')).toBeNull()
    expect(parseCoordinateQuery('Курск')).toBeNull()
  })
})

describe('searchPlaces', () => {
  it('calls Nominatim with the query and maps results', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 1,
          display_name: 'Курск, Россия',
          lat: '51.7305',
          lon: '36.1923',
          boundingbox: ['51.6', '51.8', '36.0', '36.4'],
        },
      ],
    })

    const results = await searchPlaces('Курск', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      isOnline: () => true,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('nominatim.openstreetmap.org/search')
    expect(url).toContain('q=%D0%9A%D1%83%D1%80%D1%81%D0%BA')
    expect(String(init.headers && (init.headers as Record<string, string>)['User-Agent'])).toContain(
      'AgroDesk',
    )
    expect(results).toHaveLength(1)
    expect(results[0]?.label).toBe('Курск, Россия')
    expect(results[0]?.lat).toBeCloseTo(51.7305)
    expect(results[0]?.lng).toBeCloseTo(36.1923)
    expect(geocodeResultZoom(results[0]!)).toBe(12)
    expect(buildMapFlyTarget(results[0]!)).toEqual({
      lat: 51.7305,
      lng: 36.1923,
      zoom: 12,
      bbox: [51.6, 51.8, 36.0, 36.4],
    })
  })

  it('returns empty list when offline without calling fetch', async () => {
    const fetchImpl = vi.fn()
    const results = await searchPlaces('Курск', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      isOnline: () => false,
    })
    expect(results).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns empty list when the network fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const results = await searchPlaces('Курск', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      isOnline: () => true,
    })
    expect(results).toEqual([])
  })

  it('short-circuits coordinate input without HTTP', async () => {
    const fetchImpl = vi.fn()
    const results = await searchPlaces('51.5, 36.2', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      isOnline: () => true,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(results[0]?.lat).toBe(51.5)
    expect(results[0]?.lng).toBe(36.2)
  })
})
