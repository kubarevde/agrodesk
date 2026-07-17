export type AgroPlanStatus = 'planned' | 'in_progress' | 'done' | 'cancelled'

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
  workTypeName: string
  equipmentName: string | null
  implementName: string | null
  employeeName: string | null
  actualShiftId: string | null
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

export const STATUS_LABELS: Record<AgroPlanStatus, string> = {
  planned: 'Запланировано',
  in_progress: 'В работе',
  done: 'Выполнено',
  cancelled: 'Отменено',
}
