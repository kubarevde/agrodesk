import { describe, expect, it } from 'vitest'
import { CloudLightning, Sun } from 'lucide-react'
import { formatTemp, weatherIcon } from './utils'

describe('weather utils', () => {
  it('maps clear and thunder codes', () => {
    expect(weatherIcon(0)).toBe(Sun)
    expect(weatherIcon(95)).toBe(CloudLightning)
  })

  it('formats temperature with sign', () => {
    expect(formatTemp(26.3)).toBe('+26°')
    expect(formatTemp(-3.2)).toBe('-3°')
  })
})
