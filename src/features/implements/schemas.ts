import { z } from 'zod'
import { CATEGORY_OPTIONS, MAINTENANCE_TYPES } from './types'

export const implementFormSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  category: z.enum(CATEGORY_OPTIONS, { message: 'Выберите категорию' }),
  serial_number: z.string().optional(),
  year_of_manufacture: z.number().int().min(1950).max(2100).optional(),
  description: z.string().optional(),
  current_equipment_id: z.string().optional(),
  image_url: z.string().optional(),
  current_usage_hours: z.number().min(0).optional(),
  service_interval_hours: z.number().positive().optional(),
})

export type ImplementFormValues = z.infer<typeof implementFormSchema>

export const attachSchema = z.object({
  equipment_id: z.string().min(1, 'Выберите технику'),
})

export type AttachFormValues = z.infer<typeof attachSchema>

export const maintenanceFormSchema = z.object({
  date: z.string().min(1, 'Укажите дату'),
  type: z.enum(MAINTENANCE_TYPES, { message: 'Выберите тип ТО' }),
  cost: z.number().min(0).optional(),
  description: z.string().optional(),
})

export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>
