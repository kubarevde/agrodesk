import { z } from 'zod'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from './utils'

export const expenseFormSchema = z.object({
  date: z.string().min(1, 'Укажите дату'),
  category: z.enum(EXPENSE_CATEGORIES, { message: 'Выберите категорию' }),
  amount: z.number().gt(0, 'Сумма должна быть больше 0'),
  description: z.string().min(2, 'Описание не короче 2 символов'),
  supplier: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Выберите способ оплаты' }),
})

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>
