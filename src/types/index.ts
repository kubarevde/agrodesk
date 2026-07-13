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
}

export interface WorkType {
  id: string
  name: string
  category?: string
}

export interface Equipment {
  id: string
  name: string
  type?: string
}

export interface InventoryItem {
  id: string
  name: string
  category: 'fuel' | 'fertilizer' | 'parts' | 'seeds' | 'chemicals' | 'other'
  unit: string
  currentStock: number
  minStock: number
  totalCapacity: number
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

export interface SyncQueueItem {
  id: string
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string
  body: Record<string, unknown>
  createdAt: number
  idempotencyKey: string
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
}

export interface DashboardStats {
  activeShiftsCount: number
  activeShifts: DashboardActiveShift[]
  todayHours: number
  monthShipmentWeight: number
  criticalInventoryCount: number
  weeklyHours: DashboardWeeklyHours[]
}
