import { describe, expect, it } from 'vitest'
import { buildAuditChangeRows, buildAuditDetailSections, formatAuditValue } from './auditDetail'
import { getAuditFieldLabel, isTechnicalAuditField } from './auditFieldLabels'
import type { AuditLogEntry } from '../types'

describe('auditFieldLabels', () => {
  it('maps known employee fields', () => {
    expect(getAuditFieldLabel('full_name')).toBe('ФИО')
    expect(getAuditFieldLabel('hourly_rate')).toBe('Ставка в час')
  })

  it('maps shift time fields in Russian', () => {
    expect(getAuditFieldLabel('start_time')).toBe('Время начала')
    expect(getAuditFieldLabel('end_time')).toBe('Время окончания')
    expect(getAuditFieldLabel('status', 'shift')).toBe('Статус смены')
  })

  it('maps access group fields', () => {
    expect(getAuditFieldLabel('sections', 'access_group')).toBe('Доступные разделы')
    expect(getAuditFieldLabel('actions', 'access_group')).toBe('Разрешённые действия')
  })

  it('falls back to sentence-case humanize', () => {
    expect(getAuditFieldLabel('weird_new_field')).toBe('Weird new field')
  })

  it('marks technical ids', () => {
    expect(isTechnicalAuditField('org_id')).toBe(true)
    expect(isTechnicalAuditField('full_name')).toBe(false)
  })
})

describe('formatAuditValue', () => {
  it('formats booleans and roles', () => {
    expect(formatAuditValue('is_active', true)).toBe('Да')
    expect(formatAuditValue('role', 'employee')).toBe('Сотрудник')
  })

  it('formats shift and inventory enums', () => {
    expect(formatAuditValue('status', 'open', 'shift')).toBe('Открыта')
    expect(formatAuditValue('type', 'income', 'inventory_operation')).toBe('Приход')
    expect(formatAuditValue('type', 'expense', 'inventory_operation')).toBe('Расход')
  })

  it('formats section/action lists for access groups', () => {
    const out = formatAuditValue('sections', ['my-shift', 'inventory'], 'access_group')
    expect(out).toContain('Моя смена')
    expect(out).toContain('ТМЦ')
  })

  it('formats iso datetime', () => {
    const out = formatAuditValue('created_at', '2026-07-17T10:04:00+00:00')
    expect(out).toMatch(/17\.07\.2026/)
  })

  it('formats purchase fields in Russian', () => {
    expect(formatAuditValue('urgency', 'urgent')).toBe('Срочно')
    expect(formatAuditValue('actual_cost', 1500)).toMatch(/1\s?500/)
    expect(getAuditFieldLabel('actual_cost')).toBe('Фактическая стоимость')
    expect(getAuditFieldLabel('urgency')).toBe('Срочность')
  })
})

describe('buildAuditDetailSections', () => {
  const base: AuditLogEntry = {
    id: '1',
    entityType: 'employee',
    entityTypeLabel: 'Сотрудники',
    entityId: 'e1',
    action: 'create',
    changedBy: 'u1',
    changedByName: 'Менеджер',
    changedAt: '2026-07-17T10:00:00Z',
    beforeData: null,
    afterData: {
      full_name: 'Иван',
      role: 'employee',
      is_active: true,
      org_id: 'a02119b7-5402-4128-9613-a6cd6940a963',
    },
    summary: 'Создание: Сотрудник «Иван»',
  }

  it('separates technical fields on create', () => {
    const detail = buildAuditDetailSections(base)
    expect(detail.fieldsTitle).toBe('Созданные значения')
    expect(detail.mainRows.some((r) => r.field === 'full_name')).toBe(true)
    expect(detail.mainRows.some((r) => r.field === 'org_id')).toBe(false)
    expect(detail.technicalRows.some((r) => r.field === 'org_id')).toBe(true)
  })

  it('builds update rows with before and after', () => {
    const rows = buildAuditChangeRows(
      { position: 'Механик' },
      { position: 'Бригадир' },
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.from).toBe('Механик')
    expect(rows[0]?.to).toBe('Бригадир')
    expect(rows[0]?.rawField).toBe('position')
  })

  it('labels shift start_time in Russian', () => {
    const rows = buildAuditChangeRows(
      { start_time: '08:00:00' },
      { start_time: '09:15:00' },
      'shift',
    )
    expect(rows[0]?.label).toBe('Время начала')
    expect(rows[0]?.from).toBe('08:00:00')
    expect(rows[0]?.to).toBe('09:15:00')
  })
})
