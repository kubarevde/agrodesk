import { z } from 'zod'

export const shipmentSchema = z.object({
  date: z.string().min(1, 'Укажите дату'),
  /** Dictionary code — preferred key */
  cropCode: z.string().min(1, 'Выберите культуру'),
  /** Display name kept in sync for legacy crop_type column */
  cropType: z.string().min(1, 'Выберите культуру'),
  quantityKg: z.number({ error: 'Укажите количество' }).gt(0, 'Количество должно быть больше 0'),
  destination: z.string().min(1, 'Укажите направление'),
  pricePerKg: z.number({ error: 'Укажите цену' }).min(0, 'Цена не может быть отрицательной'),
  notes: z.string().optional(),
  /** Optional managerial link to a done harvest shipment_request */
  shipmentRequestId: z.string().optional().or(z.literal('')),
})

export type ShipmentFormValues = z.infer<typeof shipmentSchema>
