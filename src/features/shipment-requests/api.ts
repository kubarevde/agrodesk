import { api } from '@/lib/api'
import type {
  ShipmentRequest,
  ShipmentRequestAttachment,
  ShipmentRequestCompletePayload,
  ShipmentRequestCreatePayload,
  ShipmentRequestFilters,
  ShipmentRequestPriority,
  ShipmentRequestStatus,
  ShipmentRequestUpdatePayload,
} from './types'

type ApiRecord = Record<string, unknown>

function attachmentFromApi(raw: ApiRecord): ShipmentRequestAttachment {
  return {
    id: String(raw.id),
    imageUrl: String(raw.image_url ?? ''),
    filename: String(raw.filename ?? ''),
    uploadedBy: String(raw.uploaded_by ?? ''),
    createdAt: String(raw.created_at ?? ''),
  }
}

function itemFromApi(raw: ApiRecord): ShipmentRequest {
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map((row) => attachmentFromApi(row as ApiRecord))
    : []
  return {
    id: String(raw.id),
    orgId: String(raw.org_id ?? ''),
    inventoryItemId: String(raw.inventory_item_id ?? ''),
    inventoryItemName:
      raw.inventory_item_name != null ? String(raw.inventory_item_name) : null,
    inventoryItemUnit:
      raw.inventory_item_unit != null ? String(raw.inventory_item_unit) : null,
    inventoryItemCategory:
      raw.inventory_item_category != null ? String(raw.inventory_item_category) : null,
    cropCode: raw.crop_code != null ? String(raw.crop_code) : null,
    isHarvest: raw.is_harvest === true || raw.kind === 'harvest',
    kind: raw.kind === 'harvest' ? 'harvest' : 'inventory',
    customerName: String(raw.customer_name ?? ''),
    quantity: Number(raw.quantity ?? 0),
    price: Number(raw.price ?? 0),
    plannedAt: String(raw.planned_at ?? ''),
    priority: String(raw.priority ?? 'normal') as ShipmentRequestPriority,
    status: String(raw.status ?? 'new') as ShipmentRequestStatus,
    createdBy: String(raw.created_by ?? ''),
    createdByName: raw.created_by_name != null ? String(raw.created_by_name) : null,
    assignedTo: raw.assigned_to != null ? String(raw.assigned_to) : null,
    assignedToName: raw.assigned_to_name != null ? String(raw.assigned_to_name) : null,
    completedAt: raw.completed_at != null ? String(raw.completed_at) : null,
    shiftId: raw.shift_id != null ? String(raw.shift_id) : null,
    inventoryOperationId:
      raw.inventory_operation_id != null ? String(raw.inventory_operation_id) : null,
    cancelReason: raw.cancel_reason != null ? String(raw.cancel_reason) : null,
    createdAt: String(raw.created_at ?? ''),
    updatedAt: String(raw.updated_at ?? ''),
    attachments,
  }
}

export async function fetchShipmentRequest(id: string): Promise<ShipmentRequest> {
  const { data } = await api.get<ApiRecord>(`/api/shipment-requests/${id}`)
  return itemFromApi(data as ApiRecord)
}

export async function fetchShipmentRequests(
  filters: ShipmentRequestFilters = {},
): Promise<ShipmentRequest[]> {
  const { data } = await api.get<ApiRecord[]>('/api/shipment-requests', {
    params: {
      status: filters.status || undefined,
      inventory_item_id: filters.inventoryItemId || undefined,
      customer_name: filters.customerName || undefined,
      from_date: filters.fromDate || undefined,
      to_date: filters.toDate || undefined,
      kind: filters.kind || undefined,
      crop_code: filters.cropCode || undefined,
      mine_only: filters.mineOnly ? true : undefined,
    },
  })
  return Array.isArray(data) ? data.map((row) => itemFromApi(row as ApiRecord)) : []
}

export async function createShipmentRequest(
  payload: ShipmentRequestCreatePayload,
): Promise<ShipmentRequest> {
  const { data } = await api.post<ApiRecord>('/api/shipment-requests', {
    customer_name: payload.customerName,
    inventory_item_id: payload.inventoryItemId,
    quantity: payload.quantity,
    price: payload.price,
    planned_at: payload.plannedAt,
    priority: payload.priority,
    assigned_to: payload.assignedTo || null,
  })
  return itemFromApi(data as ApiRecord)
}

export async function updateShipmentRequest(
  id: string,
  payload: ShipmentRequestUpdatePayload,
): Promise<ShipmentRequest> {
  const body: Record<string, unknown> = {}
  if (payload.customerName !== undefined) body.customer_name = payload.customerName
  if (payload.quantity !== undefined) body.quantity = payload.quantity
  if (payload.price !== undefined) body.price = payload.price
  if (payload.plannedAt !== undefined) body.planned_at = payload.plannedAt
  if (payload.priority !== undefined) body.priority = payload.priority
  const { data } = await api.patch<ApiRecord>(`/api/shipment-requests/${id}`, body)
  return itemFromApi(data as ApiRecord)
}

export async function assignShipmentRequest(
  id: string,
  assignedTo: string,
): Promise<ShipmentRequest> {
  const { data } = await api.post<ApiRecord>(`/api/shipment-requests/${id}/assign`, {
    assigned_to: assignedTo,
  })
  return itemFromApi(data as ApiRecord)
}

export async function startShipmentRequest(id: string): Promise<ShipmentRequest> {
  const { data } = await api.post<ApiRecord>(`/api/shipment-requests/${id}/start`)
  return itemFromApi(data as ApiRecord)
}

export async function completeShipmentRequest(
  id: string,
  payload: ShipmentRequestCompletePayload = {},
): Promise<ShipmentRequest> {
  const { data } = await api.post<ApiRecord>(`/api/shipment-requests/${id}/complete`, {
    image_urls: payload.imageUrls ?? [],
  })
  return itemFromApi(data as ApiRecord)
}

export async function cancelShipmentRequest(
  id: string,
  reason: string,
): Promise<ShipmentRequest> {
  const { data } = await api.post<ApiRecord>(`/api/shipment-requests/${id}/cancel`, {
    reason,
  })
  return itemFromApi(data as ApiRecord)
}
