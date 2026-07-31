export type ShipmentRequestStatus = 'new' | 'in_progress' | 'done' | 'cancelled'
export type ShipmentRequestPriority = 'normal' | 'urgent'
export type ShipmentRequestKind = 'inventory' | 'harvest'

export type ShipmentRequestAttachment = {
  id: string
  imageUrl: string
  filename: string
  uploadedBy: string
  createdAt: string
}

export type ShipmentRequest = {
  id: string
  orgId: string
  inventoryItemId: string
  inventoryItemName: string | null
  inventoryItemUnit: string | null
  inventoryItemCategory: string | null
  cropCode: string | null
  isHarvest: boolean
  kind: ShipmentRequestKind
  customerName: string
  quantity: number
  price: number
  plannedAt: string
  priority: ShipmentRequestPriority
  status: ShipmentRequestStatus
  createdBy: string
  createdByName: string | null
  assignedTo: string | null
  assignedToName: string | null
  completedAt: string | null
  shiftId: string | null
  inventoryOperationId: string | null
  cancelReason: string | null
  createdAt: string
  updatedAt: string
  attachments: ShipmentRequestAttachment[]
}

export type ShipmentRequestFilters = {
  status?: ShipmentRequestStatus | ''
  inventoryItemId?: string
  customerName?: string
  fromDate?: string
  toDate?: string
  kind?: ShipmentRequestKind | ''
  cropCode?: string
  /** Executor inbox: unassigned or assigned to me (server-enforced for execute-only). */
  mineOnly?: boolean
}

export type ShipmentRequestCreatePayload = {
  customerName: string
  inventoryItemId: string
  quantity: number
  price: number
  plannedAt: string
  priority: ShipmentRequestPriority
  assignedTo?: string | null
}

export type ShipmentRequestUpdatePayload = {
  customerName?: string
  quantity?: number
  price?: number
  plannedAt?: string
  priority?: ShipmentRequestPriority
}

export type ShipmentRequestCompletePayload = {
  imageUrls?: string[]
}
