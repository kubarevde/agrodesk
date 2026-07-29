import { describe, expect, it } from 'vitest'
import {
  categoryLabel,
  priorityLabel,
  statusLabel,
  supportCategoryOptions,
  supportPriorityOptions,
  supportSortOptions,
  supportStatusOptions,
} from './labels'
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from './types'

describe('support labels', () => {
  it('maps every category to Russian (not machine code)', () => {
    for (const code of Object.keys(SUPPORT_CATEGORIES)) {
      const label = categoryLabel(code)
      expect(label).not.toBe(code)
      expect(label.length).toBeGreaterThan(2)
    }
    expect(categoryLabel('bug')).toBe('Ошибка в системе')
  })

  it('maps statuses for user and staff audiences', () => {
    for (const code of Object.keys(SUPPORT_STATUSES)) {
      expect(statusLabel(code, 'user')).not.toBe(code)
      expect(statusLabel(code, 'staff')).not.toBe(code)
    }
    expect(statusLabel('new')).toBe('Новый')
    expect(statusLabel('resolved')).toBe('Решён')
    expect(statusLabel('waiting_user', 'user')).toBe('Ждёт вашего ответа')
    expect(statusLabel('waiting_user', 'staff')).toBe('Ждёт ответа пользователя')
    expect(statusLabel('in_progress')).toBe('В работе')
    expect(statusLabel('closed')).toBe('Закрыт')
  })

  it('maps priorities to Russian', () => {
    for (const code of Object.keys(SUPPORT_PRIORITIES)) {
      expect(priorityLabel(code)).not.toBe(code)
    }
    expect(priorityLabel('normal')).toBe('Обычный')
    expect(priorityLabel('high')).toBe('Высокий')
  })

  it('select options expose Russian labels for Base UI items', () => {
    const statuses = supportStatusOptions('user', true)
    expect(statuses.find((o) => o.value === 'all')?.label).toBe('Все статусы')
    expect(statuses.find((o) => o.value === 'new')?.label).toBe('Новый')
    expect(statuses.every((o) => o.label !== o.value)).toBe(true)

    const cats = supportCategoryOptions()
    expect(cats.find((o) => o.value === 'how_to')?.label).toContain('Как работать')

    const prios = supportPriorityOptions()
    expect(prios.map((o) => o.label)).toEqual(['Обычный', 'Высокий'])

    const sort = supportSortOptions()
    expect(sort.find((o) => o.value === 'updated')?.label).toBe('По дате обновления')
  })
})
