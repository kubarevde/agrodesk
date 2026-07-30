import { describe, expect, it } from 'vitest'
import {
  dayAdvisorySeverity,
  plansHaveAdvisories,
  primaryAdvisoryCode,
  worstAdvisorySeverity,
} from './advisoryUi'
import type { AgroPlan, WeatherAdvisory } from './types'

function advisory(
  partial: Partial<WeatherAdvisory> & Pick<WeatherAdvisory, 'code' | 'severity'>,
): WeatherAdvisory {
  return {
    title: partial.title ?? partial.code,
    message: partial.message ?? '',
    date: partial.date ?? '2026-07-15',
    tempMin: null,
    tempMax: null,
    precipitationMm: null,
    windSpeedMs: null,
    ...partial,
  }
}

function plan(advisories: WeatherAdvisory[]): AgroPlan {
  return {
    id: '1',
    fieldId: 'f',
    fieldIds: ['f'],
    fieldName: 'Поле',
    fieldNames: ['Поле'],
    workTypeId: 'w',
    plannedDate: '2026-07-15',
    plannedEndDate: null,
    equipmentId: null,
    implementId: null,
    employeeId: null,
    notes: null,
    status: 'planned',
    entryKind: 'plan',
    workTypeName: 'Культивация',
    equipmentName: null,
    implementName: null,
    employeeName: null,
    actualShiftId: null,
    closedBy: null,
    closedByName: null,
    closedAt: null,
    closeNote: null,
    advisories,
  }
}

describe('advisoryUi', () => {
  it('picks warning over info and primary code from worst item', () => {
    const items = [
      advisory({ code: 'heavy_rain', severity: 'info' }),
      advisory({ code: 'frost', severity: 'warning' }),
    ]
    expect(worstAdvisorySeverity(items)).toBe('warning')
    expect(primaryAdvisoryCode(items)).toBe('frost')
  })

  it('returns null for empty advisories', () => {
    expect(worstAdvisorySeverity([])).toBeNull()
    expect(primaryAdvisoryCode([])).toBeNull()
    expect(plansHaveAdvisories([plan([])])).toBe(false)
    expect(dayAdvisorySeverity([plan([])])).toBeNull()
  })

  it('aggregates day severity across plans', () => {
    const dayPlans = [
      plan([advisory({ code: 'heavy_rain', severity: 'info' })]),
      plan([advisory({ code: 'frost', severity: 'warning' })]),
    ]
    expect(plansHaveAdvisories(dayPlans)).toBe(true)
    expect(dayAdvisorySeverity(dayPlans)).toBe('warning')
  })
})
