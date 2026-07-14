import type { AgroPlan as StoredAgroPlan } from '@/types'
import { humanLabel } from '@/lib/display'
import type { AgroPlan, AgroPlanFormInput, AgroPlanStatus } from './types'

type ApiRecord = Record<string, unknown>

function toIsoDate(value: unknown): string {
  const raw = String(value ?? '')
  return raw.slice(0, 10)
}

export function planFromApi(raw: ApiRecord): AgroPlan {
  return {
    id: String(raw.id),
    fieldId: String(raw.field_id),
    workTypeId: String(raw.work_type_id),
    plannedDate: toIsoDate(raw.planned_date),
    plannedEndDate: raw.planned_end_date ? toIsoDate(raw.planned_end_date) : null,
    equipmentId: raw.equipment_id != null ? String(raw.equipment_id) : null,
    implementId: raw.implement_id != null ? String(raw.implement_id) : null,
    employeeId: raw.employee_id != null ? String(raw.employee_id) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    status: (raw.status as AgroPlanStatus) ?? 'planned',
    fieldName: humanLabel(String(raw.field_name ?? ''), 'Поле'),
    workTypeName: humanLabel(String(raw.work_type_name ?? ''), 'Работа'),
    equipmentName: raw.equipment_name != null ? humanLabel(String(raw.equipment_name), '') || null : null,
    implementName: raw.implement_name != null ? humanLabel(String(raw.implement_name), '') || null : null,
    employeeName: raw.employee_name != null ? humanLabel(String(raw.employee_name), '') || null : null,
    actualShiftId: raw.actual_shift_id != null ? String(raw.actual_shift_id) : null,
  }
}

export function planToStored(plan: AgroPlan): StoredAgroPlan {
  return {
    id: plan.id,
    field_id: plan.fieldId,
    work_type_id: plan.workTypeId,
    planned_date: plan.plannedDate,
    planned_end_date: plan.plannedEndDate,
    equipment_id: plan.equipmentId,
    implement_id: plan.implementId,
    employee_id: plan.employeeId,
    notes: plan.notes,
    status: plan.status,
    field_name: plan.fieldName,
    work_type_name: plan.workTypeName,
    equipment_name: plan.equipmentName,
    implement_name: plan.implementName,
    employee_name: plan.employeeName,
    actual_shift_id: plan.actualShiftId,
  }
}

export function planFromStored(plan: StoredAgroPlan): AgroPlan {
  return {
    id: plan.id,
    fieldId: plan.field_id,
    workTypeId: plan.work_type_id,
    plannedDate: plan.planned_date,
    plannedEndDate: plan.planned_end_date,
    equipmentId: plan.equipment_id,
    implementId: plan.implement_id,
    employeeId: plan.employee_id,
    notes: plan.notes,
    status: plan.status,
    fieldName: plan.field_name,
    workTypeName: plan.work_type_name,
    equipmentName: plan.equipment_name,
    implementName: plan.implement_name,
    employeeName: plan.employee_name,
    actualShiftId: plan.actual_shift_id,
  }
}

export function planFiltersToApi(filters: {
  month?: string
  fieldId?: string
  employeeId?: string
  plannedDate?: string
}): ApiRecord {
  const params: ApiRecord = {}
  if (filters.month) params.month = filters.month
  if (filters.fieldId) params.field_id = filters.fieldId
  if (filters.employeeId) params.employee_id = filters.employeeId
  if (filters.plannedDate) params.planned_date = filters.plannedDate
  return params
}

export function planCreateToApi(input: AgroPlanFormInput & { plannedDateIso: string; plannedEndDateIso?: string }): ApiRecord {
  return {
    field_id: input.fieldId,
    work_type_id: input.workTypeId,
    planned_date: input.plannedDateIso,
    planned_end_date: input.plannedEndDateIso || undefined,
    equipment_id: input.equipmentId || undefined,
    implement_id: input.implementId || undefined,
    employee_id: input.employeeId || undefined,
    notes: input.notes || undefined,
  }
}
