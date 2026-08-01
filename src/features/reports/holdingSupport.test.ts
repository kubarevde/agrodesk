import { describe, expect, it } from 'vitest'
import {
  HOLDING_REPORT_SUPPORT,
  getHoldingSupport,
} from '@/features/reports/holdingSupport'
import { REPORT_DEFINITIONS } from '@/features/reports/reportDefinitions'

describe('holdingReportSupport', () => {
  it('covers every report definition id', () => {
    for (const report of REPORT_DEFINITIONS) {
      expect(getHoldingSupport(report.id)).not.toBeNull()
    }
  })

  it('allows group only for honest aggregates', () => {
    expect(HOLDING_REPORT_SUPPORT.shipments.modes).toContain('group')
    expect(HOLDING_REPORT_SUPPORT.timesheet.modes).not.toContain('group')
    expect(HOLDING_REPORT_SUPPORT.salary.groupUnsupportedReason).toBeTruthy()
  })

  it('has no marketplace report key', () => {
    expect(HOLDING_REPORT_SUPPORT).not.toHaveProperty('marketplace')
  })
})
