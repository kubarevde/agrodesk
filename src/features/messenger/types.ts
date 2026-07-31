export type ChatType = 'direct' | 'group'

export interface ChatMember {
  employeeId: string
  fullName: string
  role: string
  joinedAt: string
}

export interface ChatMessagePreview {
  id: string
  body: string
  senderId: string
  senderName: string
  createdAt: string
  attachmentUrl: string | null
}

export interface ChatListItem {
  id: string
  type: ChatType
  name: string | null
  title: string
  createdBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  members: ChatMember[]
  lastMessage: ChatMessagePreview | null
  unreadCount: number
}

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  body: string
  attachmentUrl: string | null
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  /** Client-only flag for optimistic UI */
  pending?: boolean
  /**
   * Delivery ticks for outgoing messages:
   * pending (client) → delivered (1 check) → read (2 checks).
   * Incoming messages ignore this in the UI.
   */
  deliveryStatus?: MessageDeliveryStatus
}

/** Server: delivered|read; client may use pending before POST completes. */
export type MessageDeliveryStatus = 'pending' | 'delivered' | 'read'

export interface ChatMessagesPage {
  items: ChatMessage[]
  nextBefore: string | null
  nextBeforeId: string | null
}

export interface ChatReadState {
  chatId: string
  employeeId: string
  lastReadMessageId: string | null
  updatedAt: string
}
