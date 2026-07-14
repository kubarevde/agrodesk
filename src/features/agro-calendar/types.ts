export type AgroPlanStatus = 'planned' | 'in_progress' | 'done' | 'cancelled'

export type AgroPlan = {
  id: string
  fieldId: string
  workTypeId: string
  plannedDate: string
  plannedEndDate: string | null
  equipmentId: string | null
  implementId: string | null
  employeeId: string | null
  notes: string | null
  status: AgroPlanStatus
  fieldName: string
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
  fieldId: string
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
