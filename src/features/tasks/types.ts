/** Organizational tasks — not agro calendar / shifts. */

export type TaskStatus = 'active' | 'completed' | 'cancelled'
export type TaskVisibility = 'all_employees' | 'specific_employee'

export type OrgTask = {
  id: string
  orgId: string
  title: string
  description: string | null
  visibilityType: TaskVisibility
  assigneeId: string | null
  assigneeName: string | null
  status: TaskStatus
  createdBy: string | null
  createdByName: string | null
  createdAt: string
  completedBy: string | null
  completedByName: string | null
  completedAt: string | null
  cancelledBy: string | null
  cancelledByName: string | null
  cancelledAt: string | null
  cancellationReason: string | null
}

export type TaskFilters = {
  status?: TaskStatus | 'all'
  scope?: 'my' | 'general' | 'all'
  assigneeId?: string
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  active: 'Активна',
  completed: 'Выполнена',
  cancelled: 'Отменена',
}

export const TASK_VISIBILITY_LABELS: Record<TaskVisibility, string> = {
  all_employees: 'Для всех сотрудников',
  specific_employee: 'Конкретному сотруднику',
}

export function mapTask(raw: Record<string, unknown>): OrgTask {
  return {
    id: String(raw.id),
    orgId: String(raw.org_id),
    title: String(raw.title ?? ''),
    description: raw.description != null ? String(raw.description) : null,
    visibilityType:
      raw.visibility_type === 'specific_employee' ? 'specific_employee' : 'all_employees',
    assigneeId: raw.assignee_id != null ? String(raw.assignee_id) : null,
    assigneeName: raw.assignee_name != null ? String(raw.assignee_name) : null,
    status:
      raw.status === 'completed'
        ? 'completed'
        : raw.status === 'cancelled'
          ? 'cancelled'
          : 'active',
    createdBy: raw.created_by != null ? String(raw.created_by) : null,
    createdByName: raw.created_by_name != null ? String(raw.created_by_name) : null,
    createdAt: String(raw.created_at ?? ''),
    completedBy: raw.completed_by != null ? String(raw.completed_by) : null,
    completedByName: raw.completed_by_name != null ? String(raw.completed_by_name) : null,
    completedAt: raw.completed_at != null ? String(raw.completed_at) : null,
    cancelledBy: raw.cancelled_by != null ? String(raw.cancelled_by) : null,
    cancelledByName: raw.cancelled_by_name != null ? String(raw.cancelled_by_name) : null,
    cancelledAt: raw.cancelled_at != null ? String(raw.cancelled_at) : null,
    cancellationReason:
      raw.cancellation_reason != null ? String(raw.cancellation_reason) : null,
  }
}

export function assigneeLabel(task: OrgTask): string {
  if (task.visibilityType === 'all_employees') return TASK_VISIBILITY_LABELS.all_employees
  return task.assigneeName ? `Назначена: ${task.assigneeName}` : 'Назначена сотруднику'
}

export function formatTaskDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
