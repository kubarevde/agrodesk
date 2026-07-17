import { useQuery } from '@tanstack/react-query'
import { fetchAuditLog, fetchEntityAuditHistory } from './api'
import type { AuditLogFilters } from './types'

export function useAuditLog(filters: AuditLogFilters, enabled = true) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: () => fetchAuditLog(filters),
    enabled,
  })
}

export function useEntityAuditHistory(entityType: string, entityId: string, enabled = true) {
  return useQuery({
    queryKey: ['audit-log', 'entity', entityType, entityId],
    queryFn: () => fetchEntityAuditHistory(entityType, entityId),
    enabled: enabled && Boolean(entityType && entityId),
  })
}
