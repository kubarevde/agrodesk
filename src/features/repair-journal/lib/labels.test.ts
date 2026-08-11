import { describe, expect, it } from 'vitest'
import { isActiveRepair, isInRepair, isWaitingPartsStatus } from './labels'

describe('repair attention helpers', () => {
  it('isInRepair only for in_progress (and legacy open)', () => {
    expect(isInRepair({ status: 'in_progress' })).toBe(true)
    expect(isInRepair({ status: 'open' })).toBe(true)
    expect(isInRepair({ status: 'waiting_parts' })).toBe(false)
    expect(isInRepair({ status: 'done' })).toBe(false)
  })

  it('waiting_parts status is active without being in repair', () => {
    expect(isWaitingPartsStatus('waiting_parts')).toBe(true)
    expect(isActiveRepair({ status: 'waiting_parts', waitingParts: true })).toBe(true)
    expect(isInRepair({ status: 'waiting_parts' })).toBe(false)
  })

  it('flag alone still marks attention', () => {
    expect(isActiveRepair({ status: 'done', waitingParts: true })).toBe(true)
  })

  it('closed without flag is inactive', () => {
    expect(isActiveRepair({ status: 'done', waitingParts: false })).toBe(false)
    expect(isActiveRepair({ status: 'cancelled', waitingParts: false })).toBe(false)
  })
})
