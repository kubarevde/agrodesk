export const SUPPORT_CATEGORIES = {
  bug: 'Ошибка в системе',
  access: 'Доступы и роли',
  data: 'Проблемы с данными',
  how_to: 'Как работать с разделами',
  suggestion: 'Предложение по улучшению',
  other: 'Другое',
} as const

export const SUPPORT_STATUSES = {
  new: 'Новый',
  in_progress: 'В работе',
  waiting_user: 'Ждёт ответа',
  resolved: 'Решён',
  closed: 'Закрыт',
} as const

/** User-facing waiting label (more personal). */
export const SUPPORT_STATUS_USER: Record<string, string> = {
  ...SUPPORT_STATUSES,
  waiting_user: 'Ждёт вашего ответа',
}

/** Staff-facing waiting label. */
export const SUPPORT_STATUS_STAFF: Record<string, string> = {
  ...SUPPORT_STATUSES,
  waiting_user: 'Ждёт ответа пользователя',
}

export const SUPPORT_PRIORITIES = {
  normal: 'Обычный',
  high: 'Высокий',
} as const

export const SUPPORT_ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  employee: 'Сотрудник',
}

export type SupportCategory = keyof typeof SUPPORT_CATEGORIES
export type SupportStatus = keyof typeof SUPPORT_STATUSES
export type SupportPriority = keyof typeof SUPPORT_PRIORITIES

export interface SupportAttachment {
  id: string
  fileUrl: string
  filename: string
  createdAt: string
}

export interface SupportMessage {
  id: string
  authorType: 'employee' | 'superadmin'
  authorName: string
  body: string
  createdAt: string
  attachments: SupportAttachment[]
}

export interface SupportTicket {
  id: string
  orgId: string
  orgName: string
  authorId: string
  authorRole: string
  authorName: string
  category: SupportCategory | string
  subject: string
  status: SupportStatus | string
  priority: SupportPriority | string
  assigneeSuperadminId: string | null
  assigneeEmail: string | null
  unreadForUser: boolean
  unreadForStaff: boolean
  createdAt: string
  updatedAt: string
  closedAt: string | null
  lastMessageAt: string | null
  lastMessagePreview: string | null
  messages?: SupportMessage[]
}

export interface SupportAttachmentInput {
  fileUrl: string
  filename: string
}

export interface SupportTicketCreatePayload {
  category: SupportCategory
  subject: string
  body: string
  priority?: SupportPriority
  attachments?: SupportAttachmentInput[]
}

export interface SupportReplyTemplate {
  id: string
  category: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
}
