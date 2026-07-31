import { describe, expect, it } from 'vitest'
import { isoDay, isIsoDayInRange } from './utils'

describe('shipments date helpers', () => {
  it('extracts ISO day from datetime', () => {
    expect(isoDay('2026-07-15T12:00:00Z')).toBe('2026-07-15')
    expect(isoDay(null)).toBeNull()
  })

  it('checks inclusive ISO day range', () => {
    expect(isIsoDayInRange('2026-07-10', '2026-07-01', '2026-07-31')).toBe(true)
    expect(isIsoDayInRange('2026-06-30', '2026-07-01', '2026-07-31')).toBe(false)
  })
})
