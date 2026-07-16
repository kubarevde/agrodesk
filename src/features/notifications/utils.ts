import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Handshake, Wrench, type LucideIcon } from 'lucide-react'
import { formatOrgDateTime } from '@/lib/timezone'
import { NOTIFICATION_TYPE_GROUPS } from './types'

export function notificationTimeAgo(createdAt: string, timezone?: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: ru })
  if (!timezone) return relative
  return `${relative} · ${formatOrgDateTime(date, timezone)}`
}

export function notificationTypeLabel(type: string): string {
  if (NOTIFICATION_TYPE_GROUPS.maintenance.includes(type as never)) return 'ТО'
  if (NOTIFICATION_TYPE_GROUPS.sharing.includes(type as never)) return 'Шеринг'
  return 'Система'
}

export function notificationTypeIcon(type: string): LucideIcon {
  if (NOTIFICATION_TYPE_GROUPS.sharing.includes(type as never)) return Handshake
  if (NOTIFICATION_TYPE_GROUPS.maintenance.includes(type as never)) return Wrench
  return Wrench
}

export function matchesTypeGroup(
  type: string,
  group: 'maintenance' | 'sharing' | undefined,
): boolean {
  if (!group) return true
  return NOTIFICATION_TYPE_GROUPS[group].includes(type as never)
}
