import { mapMaintenanceFromApi, type MaintenanceSummary, type ToStatus } from '@/features/equipment/types'

export type ImplementCondition = 'good' | 'fair' | 'poor' | 'repair'

export type ImplementResponse = {
  id: string
  name: string
  category: string
  serial_number: string | null
  year_of_manufacture: number | null
  /** Legacy API field — unused in UI */
  condition?: ImplementCondition | string | null
  description: string | null
  image_url: string | null
  current_equipment_id: string | null
  current_equipment_name: string | null
  sharing_status: string | null
  is_active: boolean
  current_usage_hours: number
  service_interval_hours: number | null
  next_service_hours: number | null
  last_service_date: string | null
  maintenance?: MaintenanceSummary | null
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

export const MAINTENANCE_TYPES = [
  'ТО-1',
  'ТО-2',
  'Замена масла',
  'Замена фильтра',
  'Ремонт',
  'Другое',
] as const

export function mapImplementFromApi(raw: Record<string, unknown>): ImplementResponse {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    category: String(raw.category ?? ''),
    serial_number: raw.serial_number != null ? String(raw.serial_number) : null,
    year_of_manufacture:
      raw.year_of_manufacture != null ? Number(raw.year_of_manufacture) : null,
    condition: raw.condition != null ? String(raw.condition) : null,
    description: raw.description != null ? String(raw.description) : null,
    image_url: raw.image_url != null ? String(raw.image_url) : null,
    current_equipment_id:
      raw.current_equipment_id != null ? String(raw.current_equipment_id) : null,
    current_equipment_name:
      raw.current_equipment_name != null ? String(raw.current_equipment_name) : null,
    sharing_status: raw.sharing_status != null ? String(raw.sharing_status) : null,
    is_active: raw.is_active !== false,
    current_usage_hours: Number(raw.current_usage_hours ?? 0),
    service_interval_hours:
      raw.service_interval_hours != null ? Number(raw.service_interval_hours) : null,
    next_service_hours:
      raw.next_service_hours != null ? Number(raw.next_service_hours) : null,
    last_service_date:
      raw.last_service_date != null ? String(raw.last_service_date) : null,
    maintenance: mapMaintenanceFromApi(raw.maintenance),
  }
}

export function implementToStatus(item: ImplementResponse): ToStatus {
  return item.maintenance?.status ?? 'no_data'
}
