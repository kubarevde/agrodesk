import type { LucideIcon } from 'lucide-react'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
} from 'lucide-react'

/** Map WMO weather_code to a compact lucide icon. */
export function weatherIcon(code: number): LucideIcon {
  if (code === 0 || code === 1) return Sun
  if (code === 2 || code === 3) return Cloud
  if (code === 45 || code === 48) return CloudFog
  if (code >= 51 && code <= 57) return CloudDrizzle
  if (code >= 61 && code <= 67) return CloudRain
  if (code >= 71 && code <= 77) return CloudSnow
  if (code >= 80 && code <= 82) return CloudDrizzle
  if (code >= 85 && code <= 86) return CloudSnow
  if (code >= 95) return CloudLightning
  return Cloud
}

export function formatTemp(value: number): string {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded}°`
}
