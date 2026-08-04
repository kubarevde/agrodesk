import { describe, expect, it } from 'vitest'
import { plannedPositionsLabel } from './AssetPurchasePlannerHint'

describe('plannedPositionsLabel', () => {
  it('uses Russian plural forms', () => {
    expect(plannedPositionsLabel(1)).toBe('1 позиция в планировщике')
    expect(plannedPositionsLabel(2)).toBe('2 позиции в планировщике')
    expect(plannedPositionsLabel(5)).toBe('5 позиций в планировщике')
    expect(plannedPositionsLabel(11)).toBe('11 позиций в планировщике')
    expect(plannedPositionsLabel(21)).toBe('21 позиция в планировщике')
  })
})
