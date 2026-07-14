export type MeterType = 'motohours' | 'km' | 'shift_hours'
export type ToStatus = 'ok' | 'warning' | 'overdue' | 'no_data'

export type EquipmentDetail = {
  id: string
  name: string
  type: string | null
  year_of_manufacture: number | null
  serial_number: string | null
  meter_type: MeterType
  current_meter: number
  to_interval: number | null
  next_to_at: number | null
  latitude: number | null
  longitude: number | null
  image_url: string | null
  is_active: boolean
  to_status: ToStatus
  meter_label: string
}

export type MeterLogResponse = {
  id: string
  equipment_id: string
  equipment_name: string
  shift_id: string | null
  shift_label: string | null
  date: string
  value_added: number
  meter_after: number
  meter_label: string
  source: 'manual' | 'shift'
  note: string | null
  created_by_name: string | null
}

export type MaintenanceResponse = {
  id: string
  equipment_id: string
  equipment_name: string
  date: string
  type: string
  meter_at: number | null
  cost: number | null
  description: string | null
  next_to_interval: number | null
  meter_label: string
  expense_id: string | null
}

export const EQUIPMENT_MAINTENANCE_TYPES = [
  'ТО-1',
  'ТО-2',
  'Замена масла',
  'Замена фильтра',
  'Ремонт',
  'Другое',
] as const

export const EQUIPMENT_TYPES = [
  'Трактор',
  'Комбайн',
  'Грузовик',
  'Прицеп',
  'Спецтехника',
  'Прочее',
] as const

export const METER_TYPE_OPTIONS: Array<{
  value: MeterType
  label: string
  hint: string
}> = [
  { value: 'motohours', label: 'Моточасы', hint: 'Вносится вручную' },
  { value: 'km', label: 'Километры', hint: 'Вносится вручную' },
  {
    value: 'shift_hours',
    label: 'Часы смен',
    hint: 'Авто: записывается при закрытии смены',
  },
]

export function toStatusLabel(status: ToStatus): string {
  switch (status) {
    case 'ok':
      return 'ТО в норме'
    case 'warning':
      return 'Скоро ТО'
    case 'overdue':
      return 'ТО просрочено'
    case 'no_data':
      return 'Нет плана ТО'
  }
}

export function toStatusClass(status: ToStatus): string {
  switch (status) {
    case 'ok':
      return 'bg-success text-primary-foreground'
    case 'warning':
      return 'bg-amber-500 text-primary-foreground'
    case 'overdue':
      return 'bg-destructive text-primary-foreground'
    case 'no_data':
      return 'bg-muted text-muted-foreground'
  }
}

export function toStatusIcon(status: ToStatus): 'ok' | 'warning' | 'overdue' | 'none' {
  switch (status) {
    case 'ok':
      return 'ok'
    case 'warning':
      return 'warning'
    case 'overdue':
      return 'overdue'
    case 'no_data':
      return 'none'
  }
}

export function meterProgress(current: number, nextToAt: number | null): number {
  if (nextToAt == null || nextToAt <= 0) return 0
  return Math.min(100, Math.max(0, (current / nextToAt) * 100))
}

export function formatMeterDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-')
    return `${day}.${month}.${year}`
  }
  return value
}

export function toIsoDate(value?: string): string | undefined {
  if (!value) return undefined
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const [day, month, year] = value.split('.')
  if (!day || !month || !year) return undefined
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
