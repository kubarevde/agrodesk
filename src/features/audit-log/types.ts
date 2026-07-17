import { History } from 'lucide-react'
import type { CurrentUser } from '@/lib/transformers'
import {
  AUDIT_ACTION_FILTER_VALUES,
  AUDIT_SECTION_FILTER_VALUES,
  getAuditActionLabel,
  getAuditSectionLabel,
} from './lib/auditLabels'

/** Kept for callers expecting { value, label }[]. Prefer filter option helpers. */
export const ENTITY_TYPE_OPTIONS = AUDIT_SECTION_FILTER_VALUES.map((value) => ({
  value,
  label: getAuditSectionLabel(value),
}))

export const ACTION_OPTIONS = AUDIT_ACTION_FILTER_VALUES.map((value) => ({
  value,
  label: getAuditActionLabel(value),
}))

export type AuditAction = (typeof AUDIT_ACTION_FILTER_VALUES)[number]

export type AuditLogEntry = {
  id: string
  entityType: string
  entityTypeLabel: string
  entityId: string
  action: AuditAction | string
  changedBy: string | null
  changedByName: string | null
  changedAt: string
  beforeData: Record<string, unknown> | null
  afterData: Record<string, unknown> | null
  summary: string | null
}

export type AuditLogList = {
  items: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}

export type AuditLogFilters = {
  entityType?: string
  entityId?: string
  employeeId?: string
  action?: string
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
}

export function canViewAudit(role?: CurrentUser['role']): boolean {
  return role === 'admin' || role === 'manager'
}

export { History as AuditHistoryIcon }
