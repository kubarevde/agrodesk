export type PurchaseCategory = 'equipment' | 'implement' | 'inventory_item' | 'general'
export type PurchaseUrgency = 'urgent' | 'normal' | 'low'
export type PurchaseStatus = 'planned' | 'purchased' | 'cancelled'

export type PurchasePlannerItem = {
  id: string
  orgId: string
  title: string
  category: PurchaseCategory | string
  equipmentId: string | null
  implementId: string | null
  inventoryItemId: string | null
  equipmentName: string | null
  implementName: string | null
  inventoryItemName: string | null
  linkedLabel: string | null
  urgency: PurchaseUrgency | string
  status: PurchaseStatus | string
  purchasePlace: string | null
  responsibleId: string | null
  responsibleName: string | null
  estimatedCost: number | null
  actualCost: number | null
  expenseId: string | null
  maintenanceChecklistItemId: string | null
  maintenanceId: string | null
  maintenanceAssetLabel: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string | null
  purchasedAt: string | null
}

export type PurchaseFilters = {
  status?: string
  urgency?: string
  category?: string
  responsibleId?: string
  equipmentId?: string
  implementId?: string
  maintenanceId?: string
}

export type PurchaseCreatePayload = {
  title: string
  category: PurchaseCategory
  equipmentId?: string | null
  implementId?: string | null
  inventoryItemId?: string | null
  urgency?: PurchaseUrgency
  purchasePlace?: string | null
  responsibleId?: string | null
  estimatedCost?: number | null
  notes?: string | null
}

export type PurchaseUpdatePayload = {
  title?: string
  category?: PurchaseCategory
  equipmentId?: string | null
  implementId?: string | null
  inventoryItemId?: string | null
  urgency?: PurchaseUrgency
  status?: PurchaseStatus
  purchasePlace?: string | null
  responsibleId?: string | null
  estimatedCost?: number | null
  actualCost?: number | null
  notes?: string | null
  createExpense?: boolean
  expenseCategory?: string
}
