import { z } from 'zod'
import { parseApiDate } from '@/features/worktime/utils'

const requiredNumber = (message: string) => z.number({ error: message })

export const fieldHarvestSchema = z
  .object({
    inventoryItemId: z.string().min(1, 'Выберите позицию урожая'),
    quantity: requiredNumber('Укажите количество').positive('Количество должно быть больше 0'),
    date: z.string().min(1, 'Выберите дату'),
  })
  .refine(
    (values) => {
      const selected = parseApiDate(values.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selected <= today
    },
    { message: 'Дата не может быть в будущем', path: ['date'] },
  )

export type FieldHarvestFormValues = z.infer<typeof fieldHarvestSchema>
