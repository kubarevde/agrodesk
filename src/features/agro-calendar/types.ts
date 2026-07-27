export type AgroPlanStatus = 'planned' | 'in_progress' | 'done' | 'cancelled'
export type AgroPlanEntryKind = 'plan' | 'fact'

export type AgroPlan = {
  id: string
  fieldId: string
  fieldIds: string[]
  fieldName: string
  fieldNames: string[]
  workTypeId: string
  plannedDate: string
  plannedEndDate: string | null
  equipmentId: string | null
  implementId: string | null
  employeeId: string | null
  notes: string | null
  status: AgroPlanStatus
  entryKind: AgroPlanEntryKind
  workTypeName: string
  equipmentName: string | null
  implementName: string | null
  employeeName: string | null
  actualShiftId: string | null
  closedBy: string | null
  closedByName: string | null
  closedAt: string | null
  closeNote: string | null
}

export type AgroPlanFilters = {
  month?: string
  fieldId?: string
  employeeId?: string
  plannedDate?: string
}

export type AgroPlanFormInput = {
  fieldIds: string[]
  /** @deprecated Prefer fieldIds; kept for compat */
  fieldId?: string
  workTypeId: string
  plannedDate: string
  plannedEndDate?: string
  equipmentId?: string
  implementId?: string
  employeeId?: string
  notes?: string
}

export type AgroPlanCloseOutcome = 'done' | 'cancelled'

export const STATUS_LABELS: Record<AgroPlanStatus, string> = {
  planned: 'Запланировано',
  in_progress: 'В работе',
  done: 'Выполнено',
  cancelled: 'Отменено',
}

export const ENTRY_KIND_LABELS: Record<AgroPlanEntryKind, string> = {
  plan: 'План',
  fact: 'Факт',
}

export function isOpenPlanStatus(status: AgroPlanStatus): boolean {
  return status === 'planned' || status === 'in_progress'
}
