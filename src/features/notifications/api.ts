import type { Notification } from '@/types'
import type { NotificationItem } from './types'

type ApiRecord = Record<string, unknown>

export function notificationFromApi(raw: ApiRecord): NotificationItem {
  return {
    id: String(raw.id),
    type: String(raw.type ?? ''),
    title: String(raw.title ?? ''),
    body: raw.body != null ? String(raw.body) : null,
    link: raw.link != null ? String(raw.link) : null,
    isRead: Boolean(raw.is_read),
    createdAt: String(raw.created_at ?? ''),
  }
}

export function notificationToStored(item: NotificationItem): Notification {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    link: item.link,
    is_read: item.isRead,
    created_at: item.createdAt,
  }
}

export function notificationFromStored(item: Notification): NotificationItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    link: item.link,
    isRead: item.is_read,
    createdAt: item.created_at,
  }
}

export function notificationFiltersToApi(filters: {
  isRead?: boolean
  limit?: number
}): ApiRecord {
  const params: ApiRecord = {}
  if (filters.isRead !== undefined) params.is_read = filters.isRead
  if (filters.limit !== undefined) params.limit = filters.limit
  return params
}
