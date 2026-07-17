import { describe, expect, it } from 'vitest'
import {
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditSectionLabel,
  humanizeAuditValue,
} from './auditLabels'

describe('auditLabels', () => {
  it('maps section codes to Russian labels', () => {
    expect(getAuditSectionLabel('all')).toBe('Все разделы')
    expect(getAuditSectionLabel('employee')).toBe('Сотрудники')
    expect(getAuditSectionLabel('equipment')).toBe('Техника')
  })

  it('maps action codes including aliases', () => {
    expect(getAuditActionLabel('create')).toBe('Создание')
    expect(getAuditActionLabel('updated')).toBe('Изменение')
    expect(getAuditActionLabel('deleted')).toBe('Удаление')
  })

  it('humanizes unknown codes', () => {
    expect(humanizeAuditValue('foo_bar')).toBe('Foo Bar')
    expect(getAuditSectionLabel('custom_module')).toBe('Custom Module')
  })

  it('never shows raw uuid as actor name', () => {
    expect(getAuditActorLabel(null, 'a02119b7-5402-4128-9613-a6cd6940a963')).toBe('Система')
    expect(getAuditActorLabel('Иван Петров', 'x')).toBe('Иван Петров')
  })
})
