import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { db } from '@/lib/db'
import {
  notificationFiltersToApi,
  notificationFromApi,
  notificationFromStored,
  notificationToStored,
} from './api'
import type { NotificationItem } from './types'

async function invalidateNotifications(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  ])
}

function filterStoredNotifications(
  items: NotificationItem[],
  filters: { isRead?: boolean; limit?: number },
): NotificationItem[] {
  let result = items
  if (filters.isRead !== undefined) {
    result = result.filter((item) => item.isRead === filters.isRead)
  }
  if (filters.limit != null) {
    result = result.slice(0, filters.limit)
  }
  return result
}

export function useNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.notifications.toArray()
        return cached.filter((item) => !item.is_read).length
      }

      const { data } = await api.get<{ unread: number }>('/api/notifications/count')
      return data.unread
    },
    refetchInterval: 30_000,
  })
}

export function useNotifications(filters: { isRead?: boolean; limit?: number } = {}) {
  return useQuery({
    queryKey: ['notifications', 'list', filters],
    queryFn: async (): Promise<NotificationItem[]> => {
      if (!navigator.onLine) {
        const cached = await db.notifications.orderBy('created_at').reverse().toArray()
        return filterStoredNotifications(cached.map(notificationFromStored), filters)
      }

      const { data } = await api.get<Record<string, unknown>[]>('/api/notifications', {
        params: notificationFiltersToApi(filters),
      })
      const items = data.map(notificationFromApi)
      await db.notifications.bulkPut(items.map(notificationToStored))
      return items
    },
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/notifications/${id}/read`,
      )
      return notificationFromApi(data)
    },
    onSuccess: async () => {
      await invalidateNotifications(queryClient)
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.patch('/api/notifications/read-all')
    },
    onSuccess: async () => {
      await invalidateNotifications(queryClient)
    },
  })
}
