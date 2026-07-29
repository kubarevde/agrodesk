import { api } from '@/lib/api'
import type {
  SupportAttachmentInput,
  SupportMessage,
  SupportTicket,
  SupportTicketCreatePayload,
} from './types'

type ApiRecord = Record<string, unknown>

function attachmentFromApi(raw: ApiRecord) {
  return {
    id: String(raw.id),
    fileUrl: String(raw.file_url ?? ''),
    filename: String(raw.filename ?? 'file'),
    createdAt: String(raw.created_at ?? ''),
  }
}

function messageFromApi(raw: ApiRecord): SupportMessage {
  return {
    id: String(raw.id),
    authorType: raw.author_type === 'superadmin' ? 'superadmin' : 'employee',
    authorName: String(raw.author_name ?? ''),
    body: String(raw.body ?? ''),
    createdAt: String(raw.created_at ?? ''),
    attachments: Array.isArray(raw.attachments)
      ? raw.attachments.map((a) => attachmentFromApi(a as ApiRecord))
      : [],
  }
}

export function ticketFromApi(raw: ApiRecord): SupportTicket {
  return {
    id: String(raw.id),
    orgId: String(raw.org_id ?? ''),
    orgName: String(raw.org_name ?? ''),
    authorId: String(raw.author_id ?? ''),
    authorRole: String(raw.author_role ?? ''),
    authorName: String(raw.author_name ?? ''),
    category: String(raw.category ?? 'other'),
    subject: String(raw.subject ?? ''),
    status: String(raw.status ?? 'new'),
    priority: String(raw.priority ?? 'normal'),
    assigneeSuperadminId:
      raw.assignee_superadmin_id != null ? String(raw.assignee_superadmin_id) : null,
    assigneeEmail: raw.assignee_email != null ? String(raw.assignee_email) : null,
    unreadForUser: Boolean(raw.unread_for_user),
    unreadForStaff: Boolean(raw.unread_for_staff),
    createdAt: String(raw.created_at ?? ''),
    updatedAt: String(raw.updated_at ?? ''),
    closedAt: raw.closed_at != null ? String(raw.closed_at) : null,
    lastMessageAt: raw.last_message_at != null ? String(raw.last_message_at) : null,
    lastMessagePreview:
      raw.last_message_preview != null ? String(raw.last_message_preview) : null,
    messages: Array.isArray(raw.messages)
      ? raw.messages.map((m) => messageFromApi(m as ApiRecord))
      : undefined,
  }
}

function attachmentsToApi(items: SupportAttachmentInput[] | undefined) {
  return (items ?? []).map((item) => ({
    file_url: item.fileUrl,
    filename: item.filename,
  }))
}

export async function fetchMyTickets(params?: {
  status?: string
  sort?: 'updated' | 'status'
}): Promise<SupportTicket[]> {
  const { data } = await api.get<ApiRecord[]>('/api/support/tickets', {
    params: {
      status: params?.status || undefined,
      sort: params?.sort || undefined,
    },
  })
  return data.map(ticketFromApi)
}

export async function fetchOrgTickets(params?: {
  status?: string
  sort?: 'updated' | 'status'
}): Promise<SupportTicket[]> {
  const { data } = await api.get<ApiRecord[]>('/api/support/org-tickets', {
    params: {
      status: params?.status || undefined,
      sort: params?.sort || undefined,
    },
  })
  return data.map(ticketFromApi)
}

export async function fetchTicket(id: string): Promise<SupportTicket> {
  const { data } = await api.get<ApiRecord>(`/api/support/tickets/${id}`)
  return ticketFromApi(data)
}

export async function createTicket(
  payload: SupportTicketCreatePayload,
): Promise<SupportTicket> {
  const { data } = await api.post<ApiRecord>('/api/support/tickets', {
    category: payload.category,
    subject: payload.subject,
    body: payload.body,
    priority: payload.priority ?? 'normal',
    attachments: attachmentsToApi(payload.attachments),
  })
  return ticketFromApi(data)
}

export async function replyToTicket(
  id: string,
  body: string,
  attachments?: SupportAttachmentInput[],
): Promise<SupportTicket> {
  const { data } = await api.post<ApiRecord>(`/api/support/tickets/${id}/messages`, {
    body,
    attachments: attachmentsToApi(attachments),
  })
  return ticketFromApi(data)
}

export async function fetchSupportUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>('/api/support/unread-count')
  return data.count
}

export function filenameFromUploadUrl(url: string): string {
  const part = url.split('/').pop() ?? 'file'
  return decodeURIComponent(part.split('?')[0] || 'file')
}
