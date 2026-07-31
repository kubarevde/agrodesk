import { format, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function formatChatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Вчера'
  return format(date, 'd MMM', { locale: ru })
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, 'd MMM, HH:mm', { locale: ru })
}

export function formatUnread(count: number): string {
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}
