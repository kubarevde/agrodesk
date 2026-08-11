import { describe, expect, it } from 'vitest'
import { resolveHomeRoute } from './permissions'

describe('resolveHomeRoute workspace', () => {
  it('sends employee with my-shift to workspace', () => {
    expect(resolveHomeRoute('employee', ['my-shift', 'sharing'])).toBe('/workspace')
  })
})
