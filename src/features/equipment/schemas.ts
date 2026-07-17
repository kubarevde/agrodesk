import { z } from 'zod'

export const equipmentFormSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  type: z.string().optional(),
  year_of_manufacture: z.number().int().min(1950).max(2100).optional(),
  serial_number: z.string().optional(),
  meter_type: z.enum(['motohours', 'km', 'shift_hours']),
  current_meter: z
    .number({
      required_error: 'Укажите текущий показатель',
      invalid_type_error: 'Укажите текущий показатель',
    })
    .min(0),
  to_interval: z.number().min(0).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  image_url: z.string().optional(),
})

export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>

export const meterLogSchema = z.object({
  value_added: z.number().gt(0, 'Укажите прирост'),
  date: z.string().min(1, 'Укажите дату'),
  note: z.string().optional(),
})

export type MeterLogFormValues = z.infer<typeof meterLogSchema>

export const maintenanceFormSchema = z.object({
  date: z.string().min(1),
  type: z.string().min(1),
  meter_at: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  description: z.string().optional(),
  next_to_interval: z.number().gt(0).optional(),
})

export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>
