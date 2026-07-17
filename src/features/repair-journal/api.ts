import { api } from '@/lib/api'
import type {
  ActiveRepairsSummary,
  ChecklistItem,
  ChecklistItemInput,
  RepairCreatePayload,
  RepairFilters,
  RepairJournalEntry,
  RepairUpdatePayload,
} from './types'

type ApiRecord = Record<string, unknown>

function itemFromApi(raw: ApiRecord): ChecklistItem {
  return {
    id: String(raw.id),
    maintenanceId: String(raw.maintenance_id),
    itemType: String(raw.item_type ?? 'repair'),
    description: String(raw.description ?? ''),
    isDone: Boolean(raw.is_done),
    cost: raw.cost == null ? null : Number(raw.cost),
    doneAt: raw.done_at != null ? String(raw.done_at) : null,
    createdAt: raw.created_at != null ? String(raw.created_at) : null,
  }
}

function entryFromApi(raw: ApiRecord): RepairJournalEntry {
  const items = Array.isArray(raw.checklist_items)
    ? raw.checklist_items.map((row) => itemFromApi(row as ApiRecord))
    : []
  return {
    id: String(raw.id),
    equipmentId: raw.equipment_id != null ? String(raw.equipment_id) : null,
    implementId: raw.implement_id != null ? String(raw.implement_id) : null,
    equipmentName: raw.equipment_name != null ? String(raw.equipment_name) : null,
    implementName: raw.implement_name != null ? String(raw.implement_name) : null,
    assetLabel: String(raw.asset_label ?? ''),
    date: String(raw.date ?? ''),
    type: String(raw.type ?? ''),
    description: raw.description != null ? String(raw.description) : null,
    status: String(raw.status ?? 'done'),
    priority: String(raw.priority ?? 'normal'),
    dateReturned: raw.date_returned != null ? String(raw.date_returned) : null,
    meterAt: raw.meter_at == null ? null : Number(raw.meter_at),
    cost: raw.cost == null ? null : Number(raw.cost),
    expenseId: raw.expense_id != null ? String(raw.expense_id) : null,
    checklistItems: items,
    checklistDone: Number(raw.checklist_done ?? 0),
    checklistTotal: Number(raw.checklist_total ?? items.length),
    createdAt: raw.created_at != null ? String(raw.created_at) : null,
  }
}

export async function fetchRepairs(filters: RepairFilters = {}): Promise<RepairJournalEntry[]> {
  const { data } = await api.get<ApiRecord[]>('/api/equipment-maintenance', {
    params: {
      status: filters.status || undefined,
      equipment_id: filters.equipmentId || undefined,
      implement_id: filters.implementId || undefined,
      priority: filters.priority || undefined,
      include_done: filters.includeDone ?? true,
    },
  })
  return Array.isArray(data) ? data.map((row) => entryFromApi(row as ApiRecord)) : []
}

export async function fetchActiveRepairs(): Promise<ActiveRepairsSummary> {
  const { data } = await api.get<ApiRecord>('/api/equipment-maintenance/active-count')
  const items = Array.isArray(data.items)
    ? data.items.map((row) => entryFromApi(row as ApiRecord))
    : []
  return { count: Number(data.count ?? 0), items }
}

export async function createRepair(payload: RepairCreatePayload): Promise<RepairJournalEntry> {
  const { data } = await api.post<ApiRecord>('/api/equipment-maintenance', {
    equipment_id: payload.equipmentId || null,
    implement_id: payload.implementId || null,
    date: payload.date,
    type: payload.type ?? 'Ремонт',
    description: payload.description ?? null,
    priority: payload.priority ?? 'normal',
    meter_at: payload.meterAt ?? null,
    cost: payload.cost ?? null,
    status: payload.status ?? 'in_progress',
    checklist_items: (payload.checklistItems ?? []).map((item) => ({
      item_type: item.itemType,
      description: item.description,
      cost: item.cost ?? null,
      is_done: item.isDone ?? false,
    })),
  })
  return entryFromApi(data)
}

export async function updateRepair(
  id: string,
  payload: RepairUpdatePayload,
): Promise<RepairJournalEntry> {
  const body: Record<string, unknown> = {}
  if (payload.date !== undefined) body.date = payload.date
  if (payload.type !== undefined) body.type = payload.type
  if (payload.description !== undefined) body.description = payload.description
  if (payload.priority !== undefined) body.priority = payload.priority
  if (payload.meterAt !== undefined) body.meter_at = payload.meterAt
  if (payload.cost !== undefined) body.cost = payload.cost
  if (payload.status !== undefined) body.status = payload.status
  if (payload.dateReturned !== undefined) body.date_returned = payload.dateReturned
  if (payload.expenseId !== undefined) body.expense_id = payload.expenseId
  if (payload.createExpense !== undefined) body.create_expense = payload.createExpense
  const { data } = await api.patch<ApiRecord>(`/api/equipment-maintenance/${id}`, body)
  return entryFromApi(data)
}

export async function addChecklistItem(
  repairId: string,
  item: ChecklistItemInput,
): Promise<ChecklistItem> {
  const { data } = await api.post<ApiRecord>(
    `/api/equipment-maintenance/${repairId}/checklist-items`,
    {
      item_type: item.itemType,
      description: item.description,
      cost: item.cost ?? null,
      is_done: item.isDone ?? false,
    },
  )
  return itemFromApi(data)
}

export async function updateChecklistItem(
  itemId: string,
  patch: Partial<ChecklistItemInput> & { isDone?: boolean },
): Promise<ChecklistItem> {
  const body: Record<string, unknown> = {}
  if (patch.itemType !== undefined) body.item_type = patch.itemType
  if (patch.description !== undefined) body.description = patch.description
  if (patch.cost !== undefined) body.cost = patch.cost
  if (patch.isDone !== undefined) body.is_done = patch.isDone
  const { data } = await api.patch<ApiRecord>(
    `/api/equipment-maintenance/checklist-items/${itemId}`,
    body,
  )
  return itemFromApi(data)
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  await api.delete(`/api/equipment-maintenance/checklist-items/${itemId}`)
}

/** Soft bridge to future purchase planner (prompt 4). */
export function queuePurchasePlannerIntent(item: {
  description: string
  equipmentId?: string | null
  implementId?: string | null
  maintenanceId: string
  checklistItemId: string
}): void {
  const key = 'agrodesk.purchasePlannerQueue'
  const raw = localStorage.getItem(key)
  const queue: unknown[] = raw ? (JSON.parse(raw) as unknown[]) : []
  queue.push({
    ...item,
    source: 'maintenance_checklist',
    createdAt: new Date().toISOString(),
  })
  localStorage.setItem(key, JSON.stringify(queue))
}
