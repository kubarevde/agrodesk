import { describe, expect, it } from 'vitest'
import { payrollRunFromApi } from './hooks'

describe('payrollRunFromApi', () => {
  it('normalizes missing arrays and bad dates', () => {
    const run = payrollRunFromApi({
      id: '1',
      org_id: 'o',
      period_start: '2026-08-01',
      period_end: '2026-08-31',
      status: 'draft',
      created_at: null,
      lines: null,
      unlinked_advances: undefined,
    })
    expect(run.lines).toEqual([])
    expect(run.unlinkedAdvances).toEqual([])
    expect(run.createdAt).toBe('')
    expect(run.periodStart).toBe('2026-08-01')
  })
})
