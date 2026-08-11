import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { geolocationErrorMessage, requestBrowserGeolocation } from './geolocation'

describe('geolocationErrorMessage', () => {
  it('maps permission denied', () => {
    expect(geolocationErrorMessage({ code: 1 })).toContain('запрещён')
  })

  it('maps timeout', () => {
    expect(geolocationErrorMessage({ code: 3 })).toContain('время ожидания')
  })
})

describe('requestBrowserGeolocation', () => {
  const original = globalThis.navigator

  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      configurable: true,
    })
  })

  it('returns coords on success', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: (
            success: (pos: GeolocationPosition) => void,
          ) => {
            success({
              coords: {
                latitude: 55.1234567,
                longitude: 37.7654321,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON: () => ({}),
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            })
          },
        },
      },
      configurable: true,
    })

    const result = await requestBrowserGeolocation()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.coords.latitude).toBe(55.123457)
      expect(result.coords.longitude).toBe(37.765432)
    }
  })

  it('returns message on permission denied', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: (
            _success: unknown,
            error: (err: GeolocationPositionError) => void,
          ) => {
            error({
              code: 1,
              message: 'denied',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError)
          },
        },
      },
      configurable: true,
    })

    const result = await requestBrowserGeolocation()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('запрещён')
  })
})
