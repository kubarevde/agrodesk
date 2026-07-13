import type { Employee } from '@/types'

export const POSITION_OPTIONS = [
  'тракторист',
  'комбайнёр',
  'агроном',
  'водитель',
  'разнорабочий',
  'бригадир',
  'механик',
] as const

export const ROLE_LABELS: Record<Employee['role'], string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  employee: 'Сотрудник',
}

export function getRoleBadgeClass(role: Employee['role']): string {
  switch (role) {
    case 'admin':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'manager':
      return 'border-[#DA7101]/30 bg-[#DA7101]/10 text-[#DA7101]'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

export function getStatusBadgeClass(isActive: boolean): string {
  return isActive
    ? 'border-success/30 bg-success/10 text-success'
    : 'border-border bg-muted text-muted-foreground'
}

export function getStatusLabel(isActive: boolean): string {
  return isActive ? 'Активен' : 'Уволен'
}

export function formatTelegramId(telegramId: string): string {
  return telegramId.trim() ? telegramId : '—'
}
