export interface Shift {
  id: string
  date: string
  employeeCode: string
  employeeName: string
  telegramId: string
  startTime: string
  endTime: string | null
  workType: string
  location: string
  equipment: string
  equipmentId?: string
  equipmentMeterType?: string | null
  equipmentMeterLabel?: string | null
  fieldId?: string | null
  fieldName?: string | null
  implementId?: string | null
  implementName?: string | null
  description: string
  comment: string
  status: 'open' | 'closed'
  durationRaw: number | null
  durationRounded: number | null
  latitude: number | null
  longitude: number | null
  /** Present on offline-created rows for local filtering before sync. */
  employeeId?: string
  _isLocal?: boolean
}

export interface Employee {
  id: string
  employeeCode: string
  employeeName: string
  position: string
  telegramId: string
  hourlyRate: number
  role: 'admin' | 'manager' | 'employee'
  isActive: boolean
}

export interface Location {
  id: string
  name: string
  description?: string
  isActive: boolean
}

export interface WorkType {
  id: string
  name: string
  category?: string
  isActive: boolean
}

export interface Equipment {
  id: string
  name: string
  type?: string
  isActive: boolean
  latitude?: number | null
  longitude?: number | null
}

export type MeterType = 'motohours' | 'km' | 'shift_hours'
export type ToStatus = 'ok' | 'warning' | 'overdue' | 'no_data'

export interface EquipmentExtended {
  id: string
  name: string
  type: string | null
  year_of_manufacture: number | null
  serial_number: string | null
  meter_type: MeterType
  current_meter: number
  to_interval: number | null
  next_to_at: number | null
  latitude: number | null
  longitude: number | null
  image_url: string | null
  is_active: boolean
  to_status: ToStatus
  meter_label: string
}

export interface EquipmentMeterLog {
  id: string
  equipment_id: string
  equipment_name: string
  shift_id: string | null
  shift_label: string | null
  date: string
  value_added: number
  meter_after: number
  meter_label: string
  source: 'manual' | 'shift'
  note: string | null
  created_by_name: string | null
}

export interface Field {
  id: string
  name: string
  crop_type: string | null
  area_ha: number | null
  soil_type: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  polygon: number[][] | null
  sharing_status: string | null
  is_active: boolean
}

export type ImplementCondition = 'good' | 'fair' | 'poor' | 'repair'

export interface Implement {
  id: string
  name: string
  category: string
  serial_number: string | null
  year_of_manufacture: number | null
  condition: ImplementCondition | string
  description: string | null
  image_url: string | null
  current_equipment_id: string | null
  current_equipment_name: string | null
  sharing_status: string | null
  is_active: boolean
}

export type SharingListingType = 'field' | 'equipment' | 'implement' | 'parts'
export type SharingListingStatus = 'active' | 'paused' | 'done'
export type SharingRequestStatus = 'pending' | 'accepted' | 'rejected' | 'done'

export interface SharingListing {
  id: string
  type: SharingListingType
  title: string
  description: string | null
  pricePerUnit: number | null
  priceUnit: string | null
  fieldId: string | null
  equipmentId: string | null
  implementId: string | null
  region: string | null
  contactInfo: string | null
  lat: number | null
  lng: number | null
  status: SharingListingStatus
  ownerId: string
  ownerName: string
  fieldName: string | null
  equipmentName: string | null
  implementName: string | null
  implementCategoryLabel: string | null
  images: string[]
  requestsCount: number
  createdAt: string
}

export interface SharingRequest {
  id: string
  listingId: string
  message: string | null
  desiredFrom: string | null
  desiredTo: string | null
  status: SharingRequestStatus
  requesterId: string
  requesterName: string
  ownerResponse: string | null
  listingTitle: string
  listingType: string
  listingOwnerName: string | null
  listingContactInfo: string | null
  createdAt: string
}

export interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export type AgroPlanStatus = 'planned' | 'in_progress' | 'done' | 'cancelled'

export interface AgroPlan {
  id: string
  field_id: string
  work_type_id: string
  planned_date: string
  planned_end_date: string | null
  equipment_id: string | null
  implement_id: string | null
  employee_id: string | null
  notes: string | null
  status: AgroPlanStatus
  field_name: string
  work_type_name: string
  equipment_name: string | null
  implement_name: string | null
  employee_name: string | null
  actual_shift_id: string | null
}

export interface InventoryItem {
  id: string
  name: string
  category: 'fuel' | 'fertilizer' | 'parts' | 'seeds' | 'chemicals' | 'other'
  unit: string
  currentStock: number
  minStock: number
  totalCapacity: number
  isActive: boolean
}

export interface InventoryOperation {
  id: string
  date: string
  itemId: string
  itemName: string
  type: 'income' | 'expense'
  quantity: number
  stockAfter: number
  reason?: string
  supplier?: string
  cost?: number
}

export interface Shipment {
  id: string
  date: string
  cropType: string
  quantityKg: number
  destination?: string
  pricePerKg: number | null
  totalSum: number | null
  notes?: string
}

export interface ShipmentFilters {
  from?: string
  to?: string
  cropType?: string
}

export interface Expense {
  id: string
  date: string
  category: 'fuel' | 'fertilizer' | 'parts' | 'salary' | 'rent' | 'other'
  amount: number
  description: string
  supplier?: string
  paymentMethod?: 'cash' | 'transfer' | 'invoice'
  equipmentId?: string | null
  equipmentName?: string | null
}

export interface ExpenseFilters {
  from?: string
  to?: string
  category?: Expense['category']
  equipmentId?: string
}

export interface SyncQueueItem {
  id: string
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string
  body: Record<string, unknown>
  createdAt: number
  idempotencyKey: string
  retries: number
  status: 'pending' | 'failed'
}

export interface ShiftFilters {
  from?: string
  to?: string
  employeeId?: string
  status?: 'open' | 'closed' | 'all'
}

export interface DashboardWeeklyHours {
  day: string
  hours: number
  shiftsCount: number
}

export interface DashboardActiveShift {
  id: string
  employeeName: string
  location: string
  startTime: string
  date: string
  durationMinutes: number
}

export interface DashboardCriticalItem {
  id: string
  name: string
  currentStock: number
  minStock: number
  unit: string
}

export interface DashboardEquipmentWarning {
  id: string
  name: string
  toStatus: 'warning' | 'overdue' | string
  currentMeter: number
  nextToAt: number | null
  meterLabel: string
}

export interface DashboardAgroPlanToday {
  id: string
  fieldName: string
  workTypeName: string
  status: string
}

export interface DashboardStats {
  activeShiftsCount: number
  activeShifts: DashboardActiveShift[]
  todayHours: number
  monthShipmentWeight: number
  monthShipmentsSum: number
  monthExpensesSum: number
  criticalInventoryCount: number
  criticalInventory: DashboardCriticalItem[]
  weeklyHours: DashboardWeeklyHours[]
  equipmentWarningCount: number
  equipmentWarnings: DashboardEquipmentWarning[]
  agroPlanToday: DashboardAgroPlanToday[]
  sharingNewRequests: number
}
