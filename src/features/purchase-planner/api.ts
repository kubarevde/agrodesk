import { api } from '@/lib/api'
import type {
  PurchaseCreatePayload,
  PurchaseFilters,
  PurchasePlannerItem,
  PurchaseUpdatePayload,
} from './types'

type ApiRecord = Record<string, unknown>

function itemFromApi(raw: ApiRecord): PurchasePlannerItem {
  return {
    id: String(raw.id),
    orgId: String(raw.org_id ?? ''),
    title: String(raw.title ?? ''),
    category: String(raw.category ?? 'general'),
    equipmentId: raw.equipment_id != null ? String(raw.equipment_id) : null,
    implementId: raw.implement_id != null ? String(raw.implement_id) : null,
    inventoryItemId: raw.inventory_item_id != null ? String(raw.inventory_item_id) : null,
    equipmentName: raw.equipment_name != null ? String(raw.equipment_name) : null,
    implementName: raw.implement_name != null ? String(raw.implement_name) : null,
    inventoryItemName:
      raw.inventory_item_name != null ? String(raw.inventory_item_name) : null,
    linkedLabel: raw.linked_label != null ? String(raw.linked_label) : null,
    urgency: String(raw.urgency ?? 'normal'),
    status: String(raw.status ?? 'planned'),
    purchasePlace: raw.purchase_place != null ? String(raw.purchase_place) : null,
    responsibleId: raw.responsible_id != null ? String(raw.responsible_id) : null,
    responsibleName: raw.responsible_name != null ? String(raw.responsible_name) : null,
    estimatedCost: raw.estimated_cost == null ? null : Number(raw.estimated_cost),
    actualCost: raw.actual_cost == null ? null : Number(raw.actual_cost),
    expenseId: raw.expense_id != null ? String(raw.expense_id) : null,
    maintenanceChecklistItemId:
      raw.maintenance_checklist_item_id != null
        ? String(raw.maintenance_checklist_item_id)
        : null,
    maintenanceId: raw.maintenance_id != null ? String(raw.maintenance_id) : null,
    maintenanceAssetLabel:
      raw.maintenance_asset_label != null ? String(raw.maintenance_asset_label) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    createdBy: raw.created_by != null ? String(raw.created_by) : null,
    createdAt: raw.created_at != null ? String(raw.created_at) : null,
    purchasedAt: raw.purchased_at != null ? String(raw.purchased_at) : null,
  }
}

export async function fetchPurchaseItems(
  filters: PurchaseFilters = {},
): Promise<PurchasePlannerItem[]> {
  const { data } = await api.get<ApiRecord[]>('/api/purchase-planner', {
    params: {
      status: filters.status || undefined,
      urgency: filters.urgency || undefined,
      category: filters.category || undefined,
      responsible_id: filters.responsibleId || undefined,
      equipment_id: filters.equipmentId || undefined,
      implement_id: filters.implementId || undefined,
      maintenance_id: filters.maintenanceId || undefined,
    },
  })
  return Array.isArray(data) ? data.map((row) => itemFromApi(row as ApiRecord)) : []
}

export async function fetchUrgentPurchases(): Promise<PurchasePlannerItem[]> {
  const { data } = await api.get<ApiRecord[]>('/api/purchase-planner/urgent')
  return Array.isArray(data) ? data.map((row) => itemFromApi(row as ApiRecord)) : []
}

export async function createPurchaseItem(
  payload: PurchaseCreatePayload,
): Promise<PurchasePlannerItem> {
  const { data } = await api.post<ApiRecord>('/api/purchase-planner', {
    title: payload.title,
    category: payload.category,
    equipment_id: payload.equipmentId || null,
    implement_id: payload.implementId || null,
    inventory_item_id: payload.inventoryItemId || null,
    urgency: payload.urgency ?? 'normal',
    purchase_place: payload.purchasePlace || null,
    responsible_id: payload.responsibleId || null,
    estimated_cost: payload.estimatedCost ?? null,
    notes: payload.notes || null,
  })
  return itemFromApi(data)
}

export async function updatePurchaseItem(
  id: string,
  payload: PurchaseUpdatePayload,
): Promise<PurchasePlannerItem> {
  const body: Record<string, unknown> = {}
  if (payload.title !== undefined) body.title = payload.title
  if (payload.category !== undefined) body.category = payload.category
  if (payload.equipmentId !== undefined) body.equipment_id = payload.equipmentId
  if (payload.implementId !== undefined) body.implement_id = payload.implementId
  if (payload.inventoryItemId !== undefined) body.inventory_item_id = payload.inventoryItemId
  if (payload.urgency !== undefined) body.urgency = payload.urgency
  if (payload.status !== undefined) body.status = payload.status
  if (payload.purchasePlace !== undefined) body.purchase_place = payload.purchasePlace
  if (payload.responsibleId !== undefined) body.responsible_id = payload.responsibleId
  if (payload.estimatedCost !== undefined) body.estimated_cost = payload.estimatedCost
  if (payload.actualCost !== undefined) body.actual_cost = payload.actualCost
  if (payload.notes !== undefined) body.notes = payload.notes
  if (payload.createExpense !== undefined) body.create_expense = payload.createExpense
  if (payload.expenseCategory !== undefined) body.expense_category = payload.expenseCategory
  const { data } = await api.patch<ApiRecord>(`/api/purchase-planner/${id}`, body)
  return itemFromApi(data)
}

export async function deletePurchaseItem(id: string): Promise<void> {
  await api.delete(`/api/purchase-planner/${id}`)
}

export async function checklistToPurchasePlanner(
  checklistItemId: string,
): Promise<PurchasePlannerItem> {
  const { data } = await api.post<ApiRecord>(
    `/api/equipment-maintenance/checklist-items/${checklistItemId}/to-purchase-planner`,
  )
  return itemFromApi(data)
}
