import { z } from 'zod'

export const shipmentSchema = z.object({
  date: z.string().min(1, 'Укажите дату'),
  cropType: z.string().min(1, 'Выберите культуру'),
  quantityKg: z.number({ error: 'Укажите количество' }).gt(0, 'Количество должно быть больше 0'),
  destination: z.string().min(1, 'Укажите направление'),
  pricePerKg: z.number({ error: 'Укажите цену' }).min(0, 'Цена не может быть отрицательной'),
  notes: z.string().optional(),
})

export type ShipmentFormValues = z.infer<typeof shipmentSchema>
