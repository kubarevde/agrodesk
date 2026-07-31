import { api } from '@/lib/api'
import type {
  ChatListItem,
  ChatMember,
  ChatMessage,
  ChatMessagePreview,
  ChatMessagesPage,
  ChatReadState,
  ChatType,
} from './types'

function memberFromApi(raw: Record<string, unknown>): ChatMember {
  return {
    employeeId: String(raw.employee_id),
    fullName: String(raw.full_name ?? ''),
    role: String(raw.role ?? 'member'),
    joinedAt: String(raw.joined_at ?? ''),
  }
}

function previewFromApi(raw: Record<string, unknown> | null | undefined): ChatMessagePreview | null {
  if (!raw) return null
  return {
    id: String(raw.id),
    body: String(raw.body ?? ''),
    senderId: String(raw.sender_id),
    senderName: String(raw.sender_name ?? ''),
    createdAt: String(raw.created_at ?? ''),
    attachmentUrl: raw.attachment_url != null ? String(raw.attachment_url) : null,
  }
}

export function chatFromApi(raw: Record<string, unknown>): ChatListItem {
  const membersRaw = Array.isArray(raw.members) ? raw.members : []
  return {
    id: String(raw.id),
    type: (raw.type === 'group' ? 'group' : 'direct') as ChatType,
    name: raw.name != null ? String(raw.name) : null,
    title: String(raw.title ?? raw.name ?? 'Чат'),
    createdBy: String(raw.created_by ?? ''),
    createdAt: String(raw.created_at ?? ''),
    updatedAt: String(raw.updated_at ?? ''),
    archivedAt: raw.archived_at != null ? String(raw.archived_at) : null,
    members: membersRaw.map((m) => memberFromApi(m as Record<string, unknown>)),
    lastMessage: previewFromApi(raw.last_message as Record<string, unknown> | null),
    unreadCount: Number(raw.unread_count ?? 0),
  }
}

export function messageFromApi(raw: Record<string, unknown>): ChatMessage {
  const statusRaw = raw.delivery_status != null ? String(raw.delivery_status) : 'delivered'
  const deliveryStatus: ChatMessage['deliveryStatus'] =
    statusRaw === 'read' ? 'read' : statusRaw === 'pending' ? 'pending' : 'delivered'
  return {
    id: String(raw.id),
    chatId: String(raw.chat_id),
    senderId: String(raw.sender_id),
    senderName: String(raw.sender_name ?? ''),
    body: String(raw.body ?? ''),
    attachmentUrl: raw.attachment_url != null ? String(raw.attachment_url) : null,
    createdAt: String(raw.created_at ?? ''),
    editedAt: raw.edited_at != null ? String(raw.edited_at) : null,
    deletedAt: raw.deleted_at != null ? String(raw.deleted_at) : null,
    deliveryStatus,
  }
}

function messagesPageFromApi(raw: Record<string, unknown>): ChatMessagesPage {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : []
  return {
    items: itemsRaw.map((item) => messageFromApi(item as Record<string, unknown>)),
    nextBefore: raw.next_before != null ? String(raw.next_before) : null,
    nextBeforeId: raw.next_before_id != null ? String(raw.next_before_id) : null,
  }
}

export async function fetchChats(): Promise<ChatListItem[]> {
  const { data } = await api.get<Record<string, unknown>[]>('/api/messenger/chats')
  return data.map(chatFromApi)
}

export async function createDirectChat(peerEmployeeId: string): Promise<ChatListItem> {
  const { data } = await api.post<Record<string, unknown>>('/api/messenger/chats/direct', {
    peer_employee_id: peerEmployeeId,
  })
  return chatFromApi(data)
}

export async function createGroupChat(payload: {
  name: string
  memberIds: string[]
}): Promise<ChatListItem> {
  const { data } = await api.post<Record<string, unknown>>('/api/messenger/chats/group', {
    name: payload.name,
    member_ids: payload.memberIds,
  })
  return chatFromApi(data)
}

export async function updateGroupChat(
  chatId: string,
  payload: {
    name?: string
    addMemberIds?: string[]
    removeMemberIds?: string[]
  },
): Promise<ChatListItem> {
  const { data } = await api.patch<Record<string, unknown>>(`/api/messenger/chats/${chatId}`, {
    name: payload.name,
    add_member_ids: payload.addMemberIds ?? [],
    remove_member_ids: payload.removeMemberIds ?? [],
  })
  return chatFromApi(data)
}

export async function fetchChatMessages(
  chatId: string,
  params?: { limit?: number; before?: string; beforeId?: string },
): Promise<ChatMessagesPage> {
  const { data } = await api.get<Record<string, unknown>>(
    `/api/messenger/chats/${chatId}/messages`,
    {
      params: {
        limit: params?.limit ?? 50,
        before: params?.before,
        before_id: params?.beforeId,
      },
    },
  )
  return messagesPageFromApi(data)
}

export async function sendChatMessage(
  chatId: string,
  payload: { body: string; attachmentUrl?: string | null },
): Promise<ChatMessage> {
  const { data } = await api.post<Record<string, unknown>>(
    `/api/messenger/chats/${chatId}/messages`,
    {
      body: payload.body,
      attachment_url: payload.attachmentUrl ?? null,
    },
  )
  return messageFromApi(data)
}

export async function markChatRead(
  chatId: string,
  lastReadMessageId: string | null,
): Promise<ChatReadState> {
  const { data } = await api.post<Record<string, unknown>>(
    `/api/messenger/chats/${chatId}/read`,
    { last_read_message_id: lastReadMessageId },
  )
  return {
    chatId: String(data.chat_id),
    employeeId: String(data.employee_id),
    lastReadMessageId:
      data.last_read_message_id != null ? String(data.last_read_message_id) : null,
    updatedAt: String(data.updated_at ?? ''),
  }
}

export type MessengerPeer = {
  id: string
  fullName: string
  employeeCode: string
}

export async function fetchMessengerPeers(): Promise<MessengerPeer[]> {
  const { data } = await api.get<Record<string, unknown>[]>('/api/messenger/peers')
  return data.map((raw) => ({
    id: String(raw.id),
    fullName: String(raw.full_name ?? ''),
    employeeCode: String(raw.employee_code ?? ''),
  }))
}

export function totalUnread(chats: ChatListItem[]): number {
  return chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)
}
