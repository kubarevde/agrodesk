import { describe, expect, it } from 'vitest'
import {
  adjustmentTypeLabel,
  formatPayrollPeriod,
  payrollStatusLabel,
  schemeLabel,
} from './labels'

describe('payroll labels', () => {
  it('maps schemes and statuses to Russian', () => {
    expect(schemeLabel('hourly')).toBe('Почасовая')
    expect(schemeLabel('per_shift')).toBe('Посменная')
    expect(schemeLabel('bogus')).toBe('—')
    expect(payrollStatusLabel('draft')).toBe('Черновик')
    expect(adjustmentTypeLabel('bonus')).toBe('Премия')
  })

  it('formats same-month period in Russian', () => {
    expect(formatPayrollPeriod('2026-08-01', '2026-08-31')).toMatch(/августа 2026/)
  })

  it('handles invalid dates', () => {
    expect(formatPayrollPeriod('', '2026-08-31')).toBe('—')
  })
})
