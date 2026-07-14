import { format, parse } from 'date-fns'
import type {
  DashboardActiveShift,
  DashboardAgroPlanToday,
  DashboardCriticalItem,
  DashboardEquipmentWarning,
  DashboardStats,
  DashboardWeeklyHours,
  Employee,
  Equipment,
  Expense,
  ExpenseFilters,
  InventoryItem,
  InventoryOperation,
  Location,
  Shift,
  ShiftFilters,
  Shipment,
  ShipmentFilters,
  WorkType,
} from '@/types'

type ApiRecord = Record<string, unknown>

export interface CurrentUser {
  id: string
  employeeCode: string
  fullName: string
  position: string | null
  role: 'admin' | 'manager' | 'employee'
  hourlyRate: number
}

export interface ShiftCreateInput {
  locationId: string
  workTypeId: string
  equipmentId?: string
  fieldId?: string
  implementId?: string
  latitude?: number | null
  longitude?: number | null
  employeeId?: string
}

export interface ShiftManualAddInput {
  employeeId: string
  date: string
  startTime: string
  endTime: string
  locationId: string
  workTypeId: string
  equipmentId?: string
  fieldId?: string
  implementId?: string
  description?: string
  comment?: string
}

export interface ShiftCloseInput {
  description: string
  comment?: string
}

export interface ShiftUpdateInput {
  employeeId?: string
  date?: string
  startTime?: string
  endTime?: string | null
  locationId?: string
  workTypeId?: string
  equipmentId?: string | null
  description?: string
  comment?: string
  status?: 'open' | 'closed'
  latitude?: number | null
  longitude?: number | null
}

function normalizeTime(value: unknown): string {
  const str = String(value ?? '')
  if (!str) return ''
  if (str.length === 5) return `${str}:00`
  return str.slice(0, 8)
}

export function isoDateToDisplay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return format(new Date(year, month - 1, day), 'dd.MM.yyyy')
}

export function displayDateToIso(display: string): string {
  const parsed = parse(display, 'dd.MM.yyyy', new Date())
  return format(parsed, 'yyyy-MM-dd')
}

function toShiftTimeValue(time: string): string {
  return time.length === 5 ? `${time}:00` : time
}

function toNumber(value: unknown): number {
  if (value == null || value === '') return 0
  return Number(value)
}

export function shiftFromApi(raw: ApiRecord): Shift {
  return {
    id: String(raw.id),
    date: isoDateToDisplay(String(raw.date)),
    employeeCode: String(raw.employee_code),
    employeeName: String(raw.employee_name),
    telegramId: '',
    startTime: normalizeTime(raw.start_time),
    endTime: raw.end_time ? normalizeTime(raw.end_time) : null,
    workType: String(raw.work_type),
    location: String(raw.location),
    equipment: raw.equipment ? String(raw.equipment) : '',
    equipmentId: raw.equipment_id != null ? String(raw.equipment_id) : undefined,
    equipmentMeterType: raw.equipment_meter_type != null ? String(raw.equipment_meter_type) : null,
    equipmentMeterLabel:
      raw.equipment_meter_label != null ? String(raw.equipment_meter_label) : null,
    fieldId: raw.field_id != null ? String(raw.field_id) : null,
    fieldName: raw.field_name != null ? String(raw.field_name) : null,
    implementId: raw.implement_id != null ? String(raw.implement_id) : null,
    implementName: raw.implement_name != null ? String(raw.implement_name) : null,
    description: String(raw.description ?? ''),
    comment: String(raw.comment ?? ''),
    status: raw.status as Shift['status'],
    durationRaw: raw.duration_raw != null ? Number(raw.duration_raw) : null,
    durationRounded: raw.duration_rounded != null ? Number(raw.duration_rounded) : null,
    latitude: raw.latitude != null ? Number(raw.latitude) : null,
    longitude: raw.longitude != null ? Number(raw.longitude) : null,
    employeeId: raw.employee_id != null ? String(raw.employee_id) : undefined,
  }
}

export function shiftCreateToApi(payload: ShiftCreateInput): ApiRecord {
  return {
    location_id: payload.locationId,
    work_type_id: payload.workTypeId,
    equipment_id: payload.equipmentId || undefined,
    field_id: payload.fieldId || undefined,
    implement_id: payload.implementId || undefined,
    latitude: payload.latitude ?? undefined,
    longitude: payload.longitude ?? undefined,
    employee_id: payload.employeeId,
  }
}

export function shiftManualAddToApi(payload: ShiftManualAddInput): ApiRecord {
  return {
    employee_id: payload.employeeId,
    date: displayDateToIso(payload.date),
    start_time: toShiftTimeValue(payload.startTime),
    end_time: toShiftTimeValue(payload.endTime),
    location_id: payload.locationId,
    work_type_id: payload.workTypeId,
    equipment_id: payload.equipmentId || undefined,
    field_id: payload.fieldId || undefined,
    implement_id: payload.implementId || undefined,
    description: payload.description,
    comment: payload.comment,
  }
}

export function shiftCloseToApi(payload: ShiftCloseInput): ApiRecord {
  return {
    description: payload.description,
    comment: payload.comment || undefined,
  }
}

export function shiftUpdateToApi(payload: ShiftUpdateInput): ApiRecord {
  const body: ApiRecord = {}

  if (payload.employeeId !== undefined) body.employee_id = payload.employeeId
  if (payload.date !== undefined) body.date = displayDateToIso(payload.date)
  if (payload.startTime !== undefined) body.start_time = toShiftTimeValue(payload.startTime)
  if (payload.endTime !== undefined) body.end_time = payload.endTime ? toShiftTimeValue(payload.endTime) : null
  if (payload.locationId !== undefined) body.location_id = payload.locationId
  if (payload.workTypeId !== undefined) body.work_type_id = payload.workTypeId
  if (payload.equipmentId !== undefined) body.equipment_id = payload.equipmentId || null
  if (payload.description !== undefined) body.description = payload.description
  if (payload.comment !== undefined) body.comment = payload.comment
  if (payload.status !== undefined) body.status = payload.status
  if (payload.latitude !== undefined) body.latitude = payload.latitude
  if (payload.longitude !== undefined) body.longitude = payload.longitude

  return body
}

export function shiftFiltersToApi(filters: ShiftFilters): ApiRecord {
  return {
    ...(filters.from ? { from_date: displayDateToIso(filters.from) } : {}),
    ...(filters.to ? { to_date: displayDateToIso(filters.to) } : {}),
    ...(filters.employeeId ? { employee_id: filters.employeeId } : {}),
    ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
  }
}

export function employeeFromApi(raw: ApiRecord): Employee {
  return {
    id: String(raw.id),
    employeeCode: String(raw.employee_code),
    employeeName: String(raw.full_name),
    position: String(raw.position ?? ''),
    telegramId: '',
    hourlyRate: toNumber(raw.hourly_rate),
    role: raw.role as Employee['role'],
    isActive: Boolean(raw.is_active),
  }
}

export function employeeCreateToApi(values: {
  employeeCode?: string
  employeeName: string
  position: string
  hourlyRate: number
  role: Employee['role']
  password?: string
}): ApiRecord {
  return {
    employee_code: values.employeeCode,
    full_name: values.employeeName,
    position: values.position,
    hourly_rate: values.hourlyRate,
    role: values.role,
    password: values.password ?? '1234',
  }
}

export function employeeUpdateToApi(values: {
  employeeCode?: string
  employeeName?: string
  position?: string
  hourlyRate?: number
  role?: Employee['role']
  password?: string
  isActive?: boolean
}): ApiRecord {
  const body: ApiRecord = {}
  if (values.employeeCode !== undefined) body.employee_code = values.employeeCode
  if (values.employeeName !== undefined) body.full_name = values.employeeName
  if (values.position !== undefined) body.position = values.position
  if (values.hourlyRate !== undefined) body.hourly_rate = values.hourlyRate
  if (values.role !== undefined) body.role = values.role
  if (values.password !== undefined) body.password = values.password
  if (values.isActive !== undefined) body.is_active = values.isActive
  return body
}

export function currentUserFromApi(raw: ApiRecord): CurrentUser {
  return {
    id: String(raw.id),
    employeeCode: String(raw.employee_code),
    fullName: String(raw.full_name),
    position: raw.position ? String(raw.position) : null,
    role: raw.role as CurrentUser['role'],
    hourlyRate: toNumber(raw.hourly_rate),
  }
}

export function locationFromApi(raw: ApiRecord): Location {
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description ? String(raw.description) : undefined,
    isActive: raw.is_active !== false,
  }
}

export function workTypeFromApi(raw: ApiRecord): WorkType {
  return {
    id: String(raw.id),
    name: String(raw.name),
    category: raw.category ? String(raw.category) : undefined,
    isActive: raw.is_active !== false,
  }
}

export function equipmentFromApi(raw: ApiRecord): Equipment {
  return {
    id: String(raw.id),
    name: String(raw.name),
    type: raw.type ? String(raw.type) : undefined,
    isActive: raw.is_active !== false,
    latitude: raw.latitude != null ? Number(raw.latitude) : null,
    longitude: raw.longitude != null ? Number(raw.longitude) : null,
  }
}

export function inventoryItemFromApi(raw: ApiRecord): InventoryItem {
  return {
    id: String(raw.id),
    name: String(raw.name),
    category: raw.category as InventoryItem['category'],
    unit: String(raw.unit),
    currentStock: toNumber(raw.current_stock),
    minStock: toNumber(raw.min_stock),
    totalCapacity: toNumber(raw.total_capacity),
    isActive: raw.is_active !== false,
  }
}

export function inventoryOperationFromApi(raw: ApiRecord): InventoryOperation {
  return {
    id: String(raw.id),
    date: isoDateToDisplay(String(raw.date)),
    itemId: String(raw.item_id),
    itemName: String(raw.item_name),
    type: raw.type as InventoryOperation['type'],
    quantity: toNumber(raw.quantity),
    stockAfter: toNumber(raw.stock_after),
    reason: raw.reason ? String(raw.reason) : undefined,
    supplier: raw.supplier ? String(raw.supplier) : undefined,
    cost: raw.cost != null ? toNumber(raw.cost) : undefined,
  }
}

export function inventoryOperationToApi(payload: {
  itemId: string
  type: 'income' | 'expense'
  quantity: number
  reason?: string
  supplier?: string
  cost?: number
  date?: string
}): ApiRecord {
  return {
    item_id: payload.itemId,
    type: payload.type,
    quantity: payload.quantity,
    reason: payload.reason,
    supplier: payload.supplier,
    cost: payload.cost,
    date: payload.date ? displayDateToIso(payload.date) : undefined,
  }
}

export function shipmentFromApi(raw: ApiRecord): Shipment {
  const quantityKg = toNumber(raw.quantity_kg)
  const pricePerKg = raw.price_per_kg != null ? toNumber(raw.price_per_kg) : null
  return {
    id: String(raw.id),
    date: isoDateToDisplay(String(raw.date)),
    cropType: String(raw.crop_type),
    quantityKg,
    destination: raw.destination ? String(raw.destination) : undefined,
    pricePerKg,
    totalSum:
      raw.total_sum != null
        ? toNumber(raw.total_sum)
        : pricePerKg != null
          ? quantityKg * pricePerKg
          : null,
    notes: raw.notes ? String(raw.notes) : undefined,
  }
}

export function shipmentFiltersToApi(filters: ShipmentFilters): ApiRecord {
  const params: ApiRecord = {}
  if (filters.from) params.from_date = displayDateToIso(filters.from)
  if (filters.to) params.to_date = displayDateToIso(filters.to)
  if (filters.cropType) params.crop_type = filters.cropType
  return params
}

export function shipmentCreateToApi(values: {
  date: string
  cropType: string
  quantityKg: number
  destination?: string
  pricePerKg?: number | null
  notes?: string
}): ApiRecord {
  return {
    date: displayDateToIso(values.date),
    crop_type: values.cropType,
    quantity_kg: values.quantityKg,
    destination: values.destination || undefined,
    price_per_kg: values.pricePerKg ?? undefined,
    notes: values.notes || undefined,
  }
}

export function shipmentUpdateToApi(values: {
  date?: string
  cropType?: string
  quantityKg?: number
  destination?: string
  pricePerKg?: number | null
  notes?: string
}): ApiRecord {
  const body: ApiRecord = {}
  if (values.date !== undefined) body.date = displayDateToIso(values.date)
  if (values.cropType !== undefined) body.crop_type = values.cropType
  if (values.quantityKg !== undefined) body.quantity_kg = values.quantityKg
  if (values.destination !== undefined) body.destination = values.destination || null
  if (values.pricePerKg !== undefined) body.price_per_kg = values.pricePerKg
  if (values.notes !== undefined) body.notes = values.notes || null
  return body
}

export function expenseFromApi(raw: ApiRecord): Expense {
  return {
    id: String(raw.id),
    date: isoDateToDisplay(String(raw.date)),
    category: raw.category as Expense['category'],
    amount: toNumber(raw.amount),
    description: String(raw.description ?? ''),
    supplier: raw.supplier ? String(raw.supplier) : undefined,
    paymentMethod: raw.payment_method
      ? (raw.payment_method as Expense['paymentMethod'])
      : undefined,
    equipmentId: raw.equipment_id != null ? String(raw.equipment_id) : null,
    equipmentName: raw.equipment_name != null ? String(raw.equipment_name) : null,
  }
}

export function expenseFiltersToApi(filters: ExpenseFilters): ApiRecord {
  const params: ApiRecord = {}
  if (filters.from) params.from_date = displayDateToIso(filters.from)
  if (filters.to) params.to_date = displayDateToIso(filters.to)
  if (filters.category) params.category = filters.category
  if (filters.equipmentId) params.equipment_id = filters.equipmentId
  return params
}

export function expenseCreateToApi(values: {
  date: string
  category: Expense['category']
  amount: number
  description: string
  supplier?: string
  paymentMethod?: Expense['paymentMethod']
  equipmentId?: string
}): ApiRecord {
  return {
    date: displayDateToIso(values.date),
    category: values.category,
    amount: values.amount,
    description: values.description,
    supplier: values.supplier || undefined,
    payment_method: values.paymentMethod || undefined,
    equipment_id: values.equipmentId || undefined,
  }
}

export function expenseUpdateToApi(values: {
  date?: string
  category?: Expense['category']
  amount?: number
  description?: string
  supplier?: string
  paymentMethod?: Expense['paymentMethod']
  equipmentId?: string
}): ApiRecord {
  const body: ApiRecord = {}
  if (values.date !== undefined) body.date = displayDateToIso(values.date)
  if (values.category !== undefined) body.category = values.category
  if (values.amount !== undefined) body.amount = values.amount
  if (values.description !== undefined) body.description = values.description
  if (values.supplier !== undefined) body.supplier = values.supplier || null
  if (values.paymentMethod !== undefined) body.payment_method = values.paymentMethod || null
  if (values.equipmentId !== undefined) body.equipment_id = values.equipmentId || null
  return body
}

export function dashboardActiveShiftFromApi(raw: ApiRecord): DashboardActiveShift {
  return {
    id: String(raw.id),
    employeeName: String(raw.employee_name),
    location: String(raw.location),
    startTime: normalizeTime(raw.start_time),
    date: raw.date ? isoDateToDisplay(String(raw.date)) : format(new Date(), 'dd.MM.yyyy'),
    durationMinutes: toNumber(raw.duration_minutes),
  }
}

export function dashboardCriticalItemFromApi(raw: ApiRecord): DashboardCriticalItem {
  return {
    id: String(raw.id),
    name: String(raw.name),
    currentStock: toNumber(raw.current_stock),
    minStock: toNumber(raw.min_stock),
    unit: String(raw.unit ?? ''),
  }
}

export function dashboardEquipmentWarningFromApi(raw: ApiRecord): DashboardEquipmentWarning {
  return {
    id: String(raw.id),
    name: String(raw.name),
    toStatus: String(raw.to_status),
    currentMeter: toNumber(raw.current_meter),
    nextToAt: raw.next_to_at != null ? toNumber(raw.next_to_at) : null,
    meterLabel: String(raw.meter_label ?? 'мч'),
  }
}

export function dashboardAgroPlanTodayFromApi(raw: ApiRecord): DashboardAgroPlanToday {
  return {
    id: String(raw.id),
    fieldName: String(raw.field_name ?? ''),
    workTypeName: String(raw.work_type_name ?? ''),
    status: String(raw.status ?? 'planned'),
  }
}

export function dashboardStatsFromApi(raw: ApiRecord): DashboardStats {
  const weeklyHours = Array.isArray(raw.weekly_hours)
    ? raw.weekly_hours.map((item) => {
        const row = item as ApiRecord
        return {
          day: String(row.day),
          hours: toNumber(row.hours),
          shiftsCount: toNumber(row.shifts_count),
        } satisfies DashboardWeeklyHours
      })
    : []

  const activeShifts = Array.isArray(raw.active_shifts)
    ? raw.active_shifts.map((item) => dashboardActiveShiftFromApi(item as ApiRecord))
    : []

  const criticalInventory = Array.isArray(raw.critical_inventory)
    ? raw.critical_inventory.map((item) => dashboardCriticalItemFromApi(item as ApiRecord))
    : []

  const equipmentWarnings = Array.isArray(raw.equipment_warnings)
    ? raw.equipment_warnings.map((item) => dashboardEquipmentWarningFromApi(item as ApiRecord))
    : []

  const agroPlanToday = Array.isArray(raw.agro_plan_today)
    ? raw.agro_plan_today.map((item) => dashboardAgroPlanTodayFromApi(item as ApiRecord))
    : []

  return {
    activeShiftsCount: toNumber(raw.active_shifts_count),
    activeShifts,
    todayHours: toNumber(raw.today_hours),
    monthShipmentWeight: toNumber(raw.month_shipments_kg),
    monthShipmentsSum: toNumber(raw.month_shipments_sum),
    monthExpensesSum: toNumber(raw.month_expenses_sum),
    criticalInventoryCount: toNumber(raw.critical_inventory_count),
    criticalInventory,
    weeklyHours,
    equipmentWarningCount: toNumber(raw.equipment_warning_count),
    equipmentWarnings,
    agroPlanToday,
    sharingNewRequests: toNumber(raw.sharing_new_requests),
  }
}
