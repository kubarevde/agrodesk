export type RepairStatus = 'in_progress' | 'done' | 'cancelled' | string
export type RepairPriority = 'urgent' | 'normal' | 'low'
export type ChecklistItemType = 'buy' | 'repair'

export type ChecklistItem = {
  id: string
  maintenanceId: string
  itemType: ChecklistItemType | string
  description: string
  isDone: boolean
  cost: number | null
  doneAt: string | null
  createdAt: string | null
}

export type RepairJournalEntry = {
  id: string
  equipmentId: string | null
  implementId: string | null
  equipmentName: string | null
  implementName: string | null
  assetLabel: string
  date: string
  type: string
  description: string | null
  status: RepairStatus
  waitingParts: boolean
  priority: RepairPriority | string
  dateReturned: string | null
  meterAt: number | null
  cost: number | null
  expenseId: string | null
  checklistItems: ChecklistItem[]
  checklistDone: number
  checklistTotal: number
  createdAt: string | null
}

export type ActiveRepairsSummary = {
  count: number
  items: RepairJournalEntry[]
}

export type RepairFilters = {
  status?: string
  waitingParts?: boolean
  /** Combined: in_progress OR waiting_parts */
  attention?: boolean
  equipmentId?: string
  implementId?: string
  priority?: string
  includeDone?: boolean
}

export type ChecklistItemInput = {
  itemType: ChecklistItemType
  description: string
  cost?: number | null
  isDone?: boolean
}

export type RepairCreatePayload = {
  equipmentId?: string | null
  implementId?: string | null
  date: string
  type?: string
  description?: string | null
  priority?: RepairPriority
  meterAt?: number | null
  cost?: number | null
  status?: RepairStatus
  waitingParts?: boolean
  checklistItems?: ChecklistItemInput[]
}

export type RepairUpdatePayload = {
  date?: string
  type?: string
  description?: string | null
  priority?: RepairPriority
  meterAt?: number | null
  cost?: number | null
  status?: RepairStatus
  waitingParts?: boolean
  dateReturned?: string | null
  expenseId?: string | null
  createExpense?: boolean
}
