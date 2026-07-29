import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTicket,
  fetchMyTickets,
  fetchOrgTickets,
  fetchSupportUnreadCount,
  fetchTicket,
  replyToTicket,
} from './api'
import type { SupportAttachmentInput, SupportTicketCreatePayload } from './types'

const POLL_MS = 45_000

export function useMySupportTickets(filters?: {
  status?: string
  sort?: 'updated' | 'status'
}) {
  return useQuery({
    queryKey: ['support', 'tickets', 'mine', filters?.status ?? 'all', filters?.sort ?? 'updated'],
    queryFn: () => fetchMyTickets(filters),
    refetchInterval: POLL_MS,
  })
}

export function useOrgSupportTickets(
  enabled: boolean,
  filters?: { status?: string; sort?: 'updated' | 'status' },
) {
  return useQuery({
    queryKey: ['support', 'tickets', 'org', filters?.status ?? 'all', filters?.sort ?? 'updated'],
    queryFn: () => fetchOrgTickets(filters),
    enabled,
    refetchInterval: POLL_MS,
  })
}

export function useSupportTicket(id: string | undefined) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['support', 'ticket', id],
    queryFn: async () => {
      const ticket = await fetchTicket(id!) // enabled guards id
      await qc.invalidateQueries({ queryKey: ['support', 'unread-count'] })
      return ticket
    },
    enabled: Boolean(id),
    refetchInterval: POLL_MS,
    retry: (count, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 403 || status === 404) return false
      return count < 2
    },
  })
}

export function useSupportUnreadCount() {
  return useQuery({
    queryKey: ['support', 'unread-count'],
    queryFn: fetchSupportUnreadCount,
    refetchInterval: POLL_MS,
  })
}

export function useCreateSupportTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SupportTicketCreatePayload) => createTicket(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['support'] })
    },
  })
}

export function useReplySupportTicket(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { body: string; attachments?: SupportAttachmentInput[] }) =>
      replyToTicket(ticketId, payload.body, payload.attachments),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['support'] })
    },
  })
}
