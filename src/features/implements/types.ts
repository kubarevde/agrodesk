export type ImplementCondition = 'good' | 'fair' | 'poor' | 'repair'

export type ImplementResponse = {
  id: string
  name: string
  category: string
  serial_number: string | null
  year_of_manufacture: number | null
  condition: ImplementCondition | string
  description: string | null
  image_url: string | null
  current_equipment_id: string | null
  current_equipment_name: string | null
  sharing_status: string | null
  is_active: boolean
}

export type ImplementMaintenanceResponse = {
  id: string
  implement_id: string
  date: string
  type: string
  cost: number | null
  description: string | null
  expense_id: string | null
}

export const CATEGORY_OPTIONS = [
  'Посевная',
  'Опрыскивание',
  'Обработка почвы',
  'Уборочная',
  'Транспорт',
] as const

export const CATEGORY_ICONS: Record<string, string> = {
  Посевная: '🌱',
  Опрыскивание: '💧',
  'Обработка почвы': '🚜',
  Уборочная: '🌾',
  Транспорт: '🚛',
}

export const CONDITION_OPTIONS = [
  { value: 'good', label: 'Хорошее' },
  { value: 'fair', label: 'Удовл.' },
  { value: 'poor', label: 'Плохое' },
  { value: 'repair', label: 'На ремонте' },
] as const

export const MAINTENANCE_TYPES = [
  'ТО-1',
  'ТО-2',
  'Замена масла',
  'Замена фильтра',
  'Ремонт',
  'Другое',
] as const

export function conditionLabel(condition: string): string {
  return CONDITION_OPTIONS.find((item) => item.value === condition)?.label ?? condition
}

export function conditionClass(condition: string): string {
  switch (condition) {
    case 'good':
      return 'bg-success text-primary-foreground'
    case 'fair':
      return 'bg-amber-500 text-primary-foreground'
    case 'poor':
      return 'bg-orange-600 text-primary-foreground'
    case 'repair':
      return 'bg-destructive text-primary-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}
