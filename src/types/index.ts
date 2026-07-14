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
}

export interface ExpenseFilters {
  from?: string
  to?: string
  category?: Expense['category']
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
}
