import { describe, expect, it } from 'vitest'
import { shiftFiltersToApi } from '@/lib/transformers'

describe('shiftFiltersToApi fieldId', () => {
  it('omits field_id when not set (legacy clients)', () => {
    const params = shiftFiltersToApi({ status: 'all' })
    expect(params).not.toHaveProperty('field_id')
    expect(params).not.toHaveProperty('employee_id')
  })

  it('sends field_id when fieldId is set', () => {
    const params = shiftFiltersToApi({ fieldId: 'field-1' })
    expect(params.field_id).toBe('field-1')
  })
})
