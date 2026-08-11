import { describe, expect, it } from 'vitest'
import {
  assigneeLabel,
  mapTask,
  TASK_STATUS_LABELS,
  TASK_VISIBILITY_LABELS,
} from './types'

describe('tasks labels', () => {
  it('exposes only Russian status labels in UI map', () => {
    expect(TASK_STATUS_LABELS.active).toBe('Активна')
    expect(TASK_STATUS_LABELS.completed).toBe('Выполнена')
    expect(TASK_STATUS_LABELS.cancelled).toBe('Отменена')
    expect(TASK_VISIBILITY_LABELS.all_employees).toBe('Для всех сотрудников')
  })

  it('maps sparse API payload without throwing', () => {
    const task = mapTask({
      id: '1',
      org_id: 'org',
      title: 'Проверить документы',
      visibility_type: 'all_employees',
      status: 'active',
      created_at: '2026-08-10T10:00:00Z',
    })
    expect(task.assigneeId).toBeNull()
    expect(task.completedByName).toBeNull()
    expect(assigneeLabel(task)).toBe('Для всех сотрудников')
  })

  it('labels personal assignee', () => {
    const task = mapTask({
      id: '2',
      org_id: 'org',
      title: 'Позвонить в сервис',
      visibility_type: 'specific_employee',
      assignee_id: 'e1',
      assignee_name: 'Иван Иванов',
      status: 'active',
      created_at: '2026-08-10T10:00:00Z',
    })
    expect(assigneeLabel(task)).toBe('Назначена: Иван Иванов')
  })
})
