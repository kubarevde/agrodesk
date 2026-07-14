import { z } from 'zod'
import { CROP_TYPES } from './utils'

export const shipmentSchema = z.object({
  date: z.string().min(1, 'Укажите дату'),
  cropType: z.enum(CROP_TYPES, { message: 'Выберите культуру' }),
  quantityKg: z.number().gt(0, 'Количество должно быть больше 0'),
  destination: z.string().min(1, 'Укажите направление'),
  pricePerKg: z.number().min(0, 'Цена не может быть отрицательной'),
  notes: z.string().optional(),
})

export type ShipmentFormValues = z.infer<typeof shipmentSchema>
