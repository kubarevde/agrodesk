import { describe, expect, it } from 'vitest'
import { editShiftSchema } from './editShiftSchema'
import { inferShiftEndDate, shiftTimeOptions } from './utils'

describe('editShiftSchema time validation', () => {
  const base = {
    startDate: '01.08.2026',
    startTime: '08:00',
    location: 'loc',
    workType: 'wt',
    status: 'closed' as const,
  }

  it('allows overnight end on the next day', () => {
    const parsed = editShiftSchema.safeParse({
      ...base,
      endDate: '02.08.2026',
      endTime: '06:00',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects end before start', () => {
    const parsed = editShiftSchema.safeParse({
      ...base,
      endDate: '01.08.2026',
      endTime: '07:00',
    })
    expect(parsed.success).toBe(false)
  })

  it('allows open shift without end', () => {
    const parsed = editShiftSchema.safeParse({
      ...base,
      status: 'open',
      endDate: '',
      endTime: '',
    })
    expect(parsed.success).toBe(true)
  })
})

describe('inferShiftEndDate', () => {
  it('uses stored endDate when present', () => {
    expect(
      inferShiftEndDate({
        date: '01.08.2026',
        startTime: '08:00:00',
        endTime: '18:00:00',
        endDate: '02.08.2026',
      }),
    ).toBe('02.08.2026')
  })

  it('infers next day for overnight when end_time < start_time', () => {
    expect(
      inferShiftEndDate({
        date: '01.08.2026',
        startTime: '22:00:00',
        endTime: '06:00:00',
        endDate: null,
      }),
    ).toBe('02.08.2026')
  })
})

describe('shiftTimeOptions', () => {
  it('includes odd minutes from existing shift', () => {
    expect(shiftTimeOptions('08:15')).toContain('08:15')
  })
})
