import { describe, expect, it } from 'vitest'
import {
  ATTENTION_KIND_META,
  attentionTitle,
  sanitizeUserText,
} from '../../controlLabels'
import { PAYROLL_SUB_OPTIONS } from '../../payrollNav'

describe('payroll control attention labels', () => {
  it('keeps reports tab key with control label', () => {
    const reports = PAYROLL_SUB_OPTIONS.find((o) => o.value === 'reports')
    expect(reports?.label).toBe('Контроль и отчётность')
  })

  it('uses human title for orphan salary expense', () => {
    expect(ATTENTION_KIND_META.orphan_salary_expense.title).toBe(
      'Расход на зарплату без связи с начислением',
    )
    expect(attentionTitle('orphan_salary_expense')).not.toMatch(/payroll/i)
  })

  it('sanitizes technical expense descriptions', () => {
    expect(sanitizeUserText('Ручная затрата без payroll_run_line', 'safe')).toBe('safe')
    expect(sanitizeUserText('ГСМ за август', 'safe')).toBe('ГСМ за август')
  })
})
