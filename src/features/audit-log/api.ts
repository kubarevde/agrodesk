import { api } from '@/lib/api'
import { getAuditSectionLabel } from './lib/auditLabels'
import type { AuditLogEntry, AuditLogFilters, AuditLogList } from './types'

type ApiRecord = Record<string, unknown>

function entryFromApi(raw: ApiRecord): AuditLogEntry {
  const entityType = String(raw.entity_type ?? '')
  return {
    id: String(raw.id),
    entityType,
    entityTypeLabel: getAuditSectionLabel(entityType),
    entityId: String(raw.entity_id),
    action: String(raw.action ?? ''),
    changedBy: raw.changed_by != null ? String(raw.changed_by) : null,
    changedByName: raw.changed_by_name != null ? String(raw.changed_by_name) : null,
    changedAt: String(raw.changed_at ?? ''),
    beforeData:
      raw.before_data && typeof raw.before_data === 'object'
        ? (raw.before_data as Record<string, unknown>)
        : null,
    afterData:
      raw.after_data && typeof raw.after_data === 'object'
        ? (raw.after_data as Record<string, unknown>)
        : null,
    summary: raw.summary != null ? String(raw.summary) : null,
  }
}

export async function fetchAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogList> {
  const { data } = await api.get<ApiRecord>('/api/audit-log', {
    params: {
      entity_type: filters.entityType || undefined,
      entity_id: filters.entityId || undefined,
      employee_id: filters.employeeId || undefined,
      action: filters.action || undefined,
      from_date: filters.fromDate || undefined,
      to_date: filters.toDate || undefined,
      page: filters.page ?? 1,
      page_size: filters.pageSize ?? 50,
    },
  })
  const items = Array.isArray(data.items) ? data.items.map((row) => entryFromApi(row as ApiRecord)) : []
  return {
    items,
    total: Number(data.total ?? 0),
    page: Number(data.page ?? 1),
    pageSize: Number(data.page_size ?? 50),
  }
}

export async function fetchEntityAuditHistory(
  entityType: string,
  entityId: string,
): Promise<AuditLogEntry[]> {
  const { data } = await api.get<ApiRecord[]>(`/api/audit-log/entity/${entityType}/${entityId}`)
  return Array.isArray(data) ? data.map((row) => entryFromApi(row as ApiRecord)) : []
}

export function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Array<{ field: string; from: string; to: string }> {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ])
  const rows: Array<{ field: string; from: string; to: string }> = []
  for (const field of [...keys].sort()) {
    const fromVal = before?.[field]
    const toVal = after?.[field]
    const from = formatDiffValue(fromVal)
    const to = formatDiffValue(toVal)
    if (from === to) continue
    rows.push({ field, from, to })
  }
  return rows
}

function formatDiffValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
