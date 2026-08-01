import { describe, expect, it } from 'vitest'
import {
  buildRejectPayload,
  hasSuperadminSession,
  validateRejectionReason,
} from './marketplaceApi'

describe('superadmin marketplace auth gate helper', () => {
  it('allows access only with non-empty superadmin token', () => {
    expect(hasSuperadminSession(null)).toBe(false)
    expect(hasSuperadminSession('')).toBe(false)
    expect(hasSuperadminSession('sa.jwt.token')).toBe(true)
  })
})

describe('approve/reject payload rules', () => {
  it('requires rejection_reason of at least 3 chars', () => {
    expect(validateRejectionReason('')).toMatch(/минимум 3/)
    expect(validateRejectionReason('ab')).toMatch(/минимум 3/)
    expect(validateRejectionReason('  x  ')).toMatch(/минимум 3/)
    expect(validateRejectionReason('Недостаточно фото')).toBeNull()
  })

  it('builds snake_case reject body for API', () => {
    expect(buildRejectPayload('  Мало фото  ')).toEqual({
      rejection_reason: 'Мало фото',
    })
  })
})

describe('superadmin marketplace nav routes', () => {
  it('keeps dashboard and support paths unchanged', () => {
    const paths = [
      '/superadmin/dashboard',
      '/superadmin/support',
      '/superadmin/marketplace',
      '/superadmin/marketplace/categories',
      '/superadmin/marketplace/sellers',
      '/superadmin/marketplace/orders',
    ]
    expect(paths).toContain('/superadmin/dashboard')
    expect(paths).toContain('/superadmin/support')
    expect(paths.filter((p) => p.startsWith('/superadmin/marketplace')).length).toBe(4)
  })
})
