import { describe, expect, it } from 'vitest'
import {
  ORG_FORM_DEFAULTS,
  buildOrgUpdatePayload,
  hierarchyRoleLabel,
  orgCreateSchema,
  orgEditSchema,
} from '@/features/superadmin/schemas'

describe('superadmin org form schema', () => {
  it('create requires owner email', () => {
    const parsed = orgCreateSchema.safeParse({
      ...ORG_FORM_DEFAULTS,
      name: 'КФХ',
      slug: 'kfh',
      ownerEmail: '',
    })
    expect(parsed.success).toBe(false)
  })

  it('edit allows empty owner email (read-only identity)', () => {
    const parsed = orgEditSchema.safeParse({
      ...ORG_FORM_DEFAULTS,
      name: 'КФХ',
      slug: 'kfh',
      ownerEmail: '',
      plan: 'basic',
    })
    expect(parsed.success).toBe(true)
  })

  it('update payload keeps subscription end date for any plan and sends marketplace explicitly', () => {
    const payload = buildOrgUpdatePayload({
      ...ORG_FORM_DEFAULTS,
      plan: 'pro',
      trialEndsAt: '2026-12-31',
      marketplaceEnabled: true,
      isActive: false,
    })
    expect(payload).toEqual({
      plan: 'pro',
      maxEmployees: 10,
      trialEndsAt: '2026-12-31',
      isActive: false,
      marketplaceEnabled: true,
      region: null,
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('slug')
  })

  it('hierarchy labels distinguish standalone / head / child', () => {
    expect(hierarchyRoleLabel({ parentName: null, childrenCount: 0 })).toBe('Самостоятельная')
    expect(hierarchyRoleLabel({ parentName: null, childrenCount: 2 })).toBe('Головная · 2 КФХ')
    expect(hierarchyRoleLabel({ parentName: 'Холдинг', childrenCount: 0 })).toBe(
      'Дочерняя → Холдинг',
    )
  })
})
