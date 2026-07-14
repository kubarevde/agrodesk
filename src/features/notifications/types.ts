export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

export type NotificationFilters = {
  isRead?: boolean
  typeGroup?: 'maintenance' | 'sharing'
  limit?: number
}

export const NOTIFICATION_TYPE_GROUPS = {
  maintenance: ['maintenance_done', 'to_overdue', 'to_due'],
  sharing: ['sharing_request', 'sharing_accepted', 'sharing_rejected'],
} as const
