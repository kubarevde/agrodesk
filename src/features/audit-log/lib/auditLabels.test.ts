import { describe, expect, it } from 'vitest'
import {
  getAuditCodeLabel,
  localizeAuditSummary,
} from './auditCodeLabels'
import {
  AUDIT_ACTION_FILTER_VALUES,
  AUDIT_ACTION_LABELS,
  getAuditActionFilterOptions,
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditSectionFilterOptions,
  getAuditSectionLabel,
  humanizeAuditValue,
} from './auditLabels'

describe('auditLabels', () => {
  it('maps section codes to Russian labels', () => {
    expect(getAuditSectionLabel('all')).toBe('Все разделы')
    expect(getAuditSectionLabel('employee')).toBe('Сотрудники')
    expect(getAuditSectionLabel('equipment')).toBe('Техника и приспособления')
    expect(getAuditSectionLabel('shipment_request')).toBe('Заявки на отгрузку')
    expect(getAuditSectionLabel('expense')).toBe('Затраты')
  })

  it('maps action codes including aliases', () => {
    expect(getAuditActionLabel('all')).toBe('Все действия')
    expect(getAuditActionLabel('create')).toBe('Создание')
    expect(getAuditActionLabel('update')).toBe('Изменение')
    expect(getAuditActionLabel('updated')).toBe('Изменение')
    expect(getAuditActionLabel('delete')).toBe('Удаление')
    expect(getAuditActionLabel('deleted')).toBe('Удаление')
  })

  it('never returns raw machine codes for known filter actions', () => {
    for (const code of ['all', 'create', 'update', 'delete', ...AUDIT_ACTION_FILTER_VALUES]) {
      const label = getAuditActionLabel(code)
      expect(label).not.toBe(code)
      expect(label).toBe(AUDIT_ACTION_LABELS[code as keyof typeof AUDIT_ACTION_LABELS])
    }
  })

  it('filter option lists show Russian labels in UI selects', () => {
    const actions = getAuditActionFilterOptions()
    expect(actions.find((o) => o.value === 'all')?.label).toBe('Все действия')
    expect(actions.find((o) => o.value === 'create')?.label).toBe('Создание')
    expect(actions.find((o) => o.value === 'update')?.label).toBe('Изменение')
    expect(actions.find((o) => o.value === 'delete')?.label).toBe('Удаление')
    expect(actions.every((o) => !['all', 'create', 'update', 'delete'].includes(o.label))).toBe(
      true,
    )

    const sections = getAuditSectionFilterOptions()
    expect(sections.find((o) => o.value === 'all')?.label).toBe('Все разделы')
    expect(sections.find((o) => o.value === 'shift')?.label).toBe('Смены')
    expect(sections.find((o) => o.value === 'shipment_request')?.label).toBe(
      'Заявки на отгрузку',
    )
  })

  it('humanizes unknown codes in sentence case', () => {
    expect(humanizeAuditValue('all')).toBe('Все')
    expect(humanizeAuditValue('foo_bar')).toBe('Foo bar')
    expect(humanizeAuditValue('start_time')).toBe('Start time')
    expect(getAuditSectionLabel('custom_module')).toBe('Custom module')
  })

  it('maps known technical tokens instead of English humanize', () => {
    expect(humanizeAuditValue('shipment_request')).toBe('Заявка на отгрузку')
    expect(humanizeAuditValue('harvest')).toBe('Урожай')
    expect(humanizeAuditValue('price')).toBe('Цена')
    expect(getAuditCodeLabel('new')).toBe('Новый')
  })

  it('maps access_group section', () => {
    expect(getAuditSectionLabel('access_group')).toBe('Группы доступа')
  })

  it('never shows raw uuid as actor name', () => {
    expect(getAuditActorLabel(null, 'a02119b7-5402-4128-9613-a6cd6940a963')).toBe('Система')
    expect(getAuditActorLabel('Иван Петров', 'x')).toBe('Иван Петров')
  })
})

describe('localizeAuditSummary', () => {
  it('rewrites technical entity codes and English phrases', () => {
    expect(localizeAuditSummary('Создание: shipment_request «ООО Ромашка»')).toBe(
      'Создание: Заявка на отгрузку «ООО Ромашка»',
    )
    expect(localizeAuditSummary('Update: Shipment request')).toBe(
      'Изменение: Заявка на отгрузку',
    )
    expect(localizeAuditSummary('Создание: ТМЦ «harvest»')).toBe(
      'Создание: ТМЦ «Урожай»',
    )
    expect(localizeAuditSummary('Price')).toBe('Цена')
  })

  it('keeps already-Russian summaries', () => {
    expect(localizeAuditSummary('Создание: Сотрудник «Иван»')).toBe(
      'Создание: Сотрудник «Иван»',
    )
  })
})
