import { describe, expect, it } from 'vitest'
import { ORG_PLANS, orgPlanLabel } from './plans'

describe('org plans', () => {
  it('keeps DB codes and Russian UI labels', () => {
    expect(ORG_PLANS.trial.code).toBe('trial')
    expect(ORG_PLANS.basic.code).toBe('basic')
    expect(ORG_PLANS.pro.code).toBe('pro')
    expect(orgPlanLabel('trial')).toBe('Пробный')
    expect(orgPlanLabel('basic')).toBe('Базовый')
    expect(orgPlanLabel('pro')).toBe('Профессиональный')
  })

  it('documents that all plans share modules; soft limits differ', () => {
    expect(ORG_PLANS.trial.defaultMaxEmployees).toBeLessThan(ORG_PLANS.basic.defaultMaxEmployees)
    expect(ORG_PLANS.basic.defaultMaxEmployees).toBeLessThan(ORG_PLANS.pro.defaultMaxEmployees)
    for (const plan of Object.values(ORG_PLANS)) {
      expect(plan.summary.toLowerCase()).toContain('модул')
    }
  })
})
