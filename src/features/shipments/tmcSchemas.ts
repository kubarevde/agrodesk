import { z } from 'zod'

export const tmcShipmentSchema = z.object({
  date: z.string().min(1, 'Укажите дату'),
  category: z.string().min(1, 'Выберите категорию'),
  inventoryItemId: z.string().min(1, 'Выберите позицию ТМЦ'),
  quantity: z.number({ error: 'Укажите количество' }).gt(0, 'Количество должно быть больше 0'),
  destination: z.string().min(1, 'Укажите направление'),
  pricePerUnit: z.number({ error: 'Укажите цену' }).min(0, 'Цена не может быть отрицательной'),
  notes: z.string().optional(),
  shipmentRequestId: z.string().optional().or(z.literal('')),
})

export type TmcShipmentFormValues = z.infer<typeof tmcShipmentSchema>
