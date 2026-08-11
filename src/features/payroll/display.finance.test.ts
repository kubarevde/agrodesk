import { describe, expect, it } from 'vitest'
import { formatMoney } from '@/features/payroll-payouts/format'
import {
  formatPayrollPeriod,
  payrollStatusLabel,
  schemeLabel,
} from '@/features/payroll/labels'

describe('payroll payout sheet display', () => {
  it('never shows raw scheme/status codes in labels', () => {
    expect(schemeLabel('hourly')).toBe('Почасовая')
    expect(payrollStatusLabel('confirmed')).toBe('Подтверждено')
    expect(formatMoney(55000)).toMatch(/55/)
    expect(formatMoney(Number.NaN)).toBe('—')
  })

  it('formats period without ISO dump', () => {
    const text = formatPayrollPeriod('2026-08-01', '2026-08-31')
    expect(text).not.toMatch(/T\d{2}:/)
    expect(text).toMatch(/2026/)
  })
})
