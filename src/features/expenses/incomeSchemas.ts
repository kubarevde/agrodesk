import { z } from 'zod'
import { PAYMENT_METHODS } from './utils'

export const incomeFormSchema = z.object({
  date: z.string().min(1, 'Укажите дату'),
  category: z.string().min(1, 'Выберите категорию'),
  amount: z.number({ error: 'Укажите сумму' }).gt(0, 'Сумма должна быть больше 0'),
  description: z.string().min(2, 'Описание не короче 2 символов'),
  counterparty: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Выберите способ оплаты' }),
  cropCode: z.string().max(80).optional().or(z.literal('')),
  varietyId: z.string().optional().nullable().or(z.literal('')),
})

export type IncomeFormValues = z.infer<typeof incomeFormSchema>
