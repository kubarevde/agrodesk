import { describe, expect, it } from 'vitest'
import { suggestNextEmployeeLogin } from './utils'

describe('suggestNextEmployeeLogin', () => {
  it('starts from EMP001 when list is empty', () => {
    expect(suggestNextEmployeeLogin([])).toBe('EMP001')
  })

  it('increments the highest EMP### code', () => {
    expect(suggestNextEmployeeLogin(['EMP000', 'EMP005', 'EMP002'])).toBe('EMP006')
  })

  it('ignores non-EMP codes when finding the next number', () => {
    expect(suggestNextEmployeeLogin(['ADM-demo', 'ivan', 'EMP003'])).toBe('EMP004')
  })

  it('keeps zero-padding to three digits', () => {
    expect(suggestNextEmployeeLogin(['EMP009'])).toBe('EMP010')
  })
})
