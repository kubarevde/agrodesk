import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchSupportReplyTemplates,
  fetchSupportStaffUnreadCount,
  fetchSupportTicket,
  fetchSupportTickets,
  replySupportTicket,
  updateSupportTicket,
  type SuperadminSupportFilters,
  type SuperadminSupportUpdate,
} from '../api'

const POLL_MS = 45_000

export function useSuperadminSupportTickets(filters: SuperadminSupportFilters) {
  return useQuery({
    queryKey: ['superadmin', 'support', 'tickets', filters],
    queryFn: () => fetchSupportTickets(filters),
    refetchInterval: POLL_MS,
  })
}

export function useSuperadminSupportTicket(id: string | undefined) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['superadmin', 'support', 'ticket', id],
    queryFn: async () => {
      const ticket = await fetchSupportTicket(id!) // enabled guards id
      await qc.invalidateQueries({ queryKey: ['superadmin', 'support', 'unread'] })
      return ticket
    },
    enabled: Boolean(id),
    refetchInterval: POLL_MS,
  })
}

export function useSuperadminSupportUnread() {
  return useQuery({
    queryKey: ['superadmin', 'support', 'unread'],
    queryFn: fetchSupportStaffUnreadCount,
    refetchInterval: POLL_MS,
  })
}

export function useSuperadminSupportTemplates(category?: string) {
  return useQuery({
    queryKey: ['superadmin', 'support', 'templates', category ?? 'all'],
    queryFn: () => fetchSupportReplyTemplates(category),
  })
}

export function useSuperadminSupportReply(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      body: string
      attachments?: { fileUrl: string; filename: string }[]
    }) => replySupportTicket(ticketId, payload.body, payload.attachments),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['superadmin', 'support'] })
    },
  })
}

export function useSuperadminSupportUpdate(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SuperadminSupportUpdate) => updateSupportTicket(ticketId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['superadmin', 'support'] })
    },
  })
}
