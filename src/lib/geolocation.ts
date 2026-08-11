export type GeoCoords = {
  latitude: number
  longitude: number
}

export type GeoRequestResult =
  | { ok: true; coords: GeoCoords }
  | { ok: false; message: string }

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  /** Without timeout many browsers hang indefinitely — looks like a dead button. */
  timeout: 20_000,
  maximumAge: 60_000,
}

/** Map browser GeolocationPositionError to a Russian user-facing message. */
export function geolocationErrorMessage(error: unknown): string {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Геолокация доступна только по HTTPS или на localhost'
  }

  const code =
    error && typeof error === 'object' && 'code' in error
      ? Number((error as { code: number }).code)
      : null

  if (code === 1) {
    return 'Доступ к геолокации запрещён. Разрешите его в настройках браузера'
  }
  if (code === 2) {
    return 'Не удалось определить местоположение. Проверьте GPS или сеть'
  }
  if (code === 3) {
    return 'Превышено время ожидания геолокации. Попробуйте ещё раз'
  }
  if (typeof navigator !== 'undefined' && !navigator.geolocation) {
    return 'Геолокация не поддерживается в этом браузере'
  }
  return 'Не удалось получить геолокацию'
}

/**
 * Request current browser coordinates.
 * Always resolves (never rejects) with a typed result for simpler UI handling.
 */
export function requestBrowserGeolocation(
  options: PositionOptions = DEFAULT_OPTIONS,
): Promise<GeoRequestResult> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return Promise.resolve({
      ok: false,
      message: 'Геолокация доступна только по HTTPS или на localhost',
    })
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({
      ok: false,
      message: 'Геолокация не поддерживается в этом браузере',
    })
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          coords: {
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
          },
        })
      },
      (error) => {
        resolve({ ok: false, message: geolocationErrorMessage(error) })
      },
      options,
    )
  })
}
