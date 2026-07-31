import { z } from 'zod'
import { parseApiDate } from '@/features/worktime/utils'

const requiredNumber = (message: string) => z.number({ error: message })

function dateNotInFuture(value: string) {
  const selected = parseApiDate(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return selected <= today
}

export const incomeSchema = z
  .object({
    itemId: z.string().min(1, 'Выберите наименование'),
    quantity: requiredNumber('Укажите количество').positive('Укажите количество больше 0'),
    supplier: z.string().min(1, 'Укажите поставщика'),
    cost: requiredNumber('Укажите стоимость').min(0, 'Стоимость не может быть отрицательной'),
    date: z.string().min(1, 'Выберите дату'),
  })
  .refine((values) => dateNotInFuture(values.date), {
    message: 'Дата не может быть в будущем',
    path: ['date'],
  })

export const expenseSchema = z
  .object({
    itemId: z.string().min(1, 'Выберите наименование'),
    quantity: requiredNumber('Укажите количество').positive('Укажите количество больше 0'),
    reason: z.string().min(1, 'Укажите причину списания'),
    date: z.string().min(1, 'Выберите дату'),
  })
  .refine((values) => dateNotInFuture(values.date), {
    message: 'Дата не может быть в будущем',
    path: ['date'],
  })

export const inventoryItemSchema = z
  .object({
    name: z.string().min(1, 'Укажите название'),
    category: z.string().min(1, 'Выберите категорию'),
    unit: z.string().min(1, 'Укажите единицу измерения'),
    currentStock: requiredNumber('Укажите остаток').min(0, 'Остаток не может быть отрицательным'),
    minStock: requiredNumber('Укажите мин. запас').min(0, 'Мин. запас не может быть отрицательным'),
    totalCapacity: requiredNumber('Укажите ёмкость').min(0, 'Ёмкость не может быть отрицательной'),
    isActive: z.boolean(),
    /** Required when category=harvest — org crop dictionary code */
    cropCode: z.string().max(80).optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (values.category.trim().toLowerCase() !== 'harvest') return
    const code = (values.cropCode ?? '').trim()
    if (!code || code === 'none') {
      ctx.addIssue({
        code: 'custom',
        message: 'Выберите культуру',
        path: ['cropCode'],
      })
    }
  })

export const adjustmentSchema = z
  .object({
    itemId: z.string().min(1, 'Выберите позицию'),
    /** User-facing direction — mapped to income/expense only at API boundary. */
    direction: z.enum(['increase', 'decrease']),
    quantity: requiredNumber('Укажите количество').positive('Укажите количество больше 0'),
    reason: z.string().min(3, 'Укажите причину корректировки (мин. 3 символа)'),
    date: z.string().min(1, 'Выберите дату'),
  })
  .refine((values) => dateNotInFuture(values.date), {
    message: 'Дата не может быть в будущем',
    path: ['date'],
  })

export type IncomeFormValues = z.infer<typeof incomeSchema>
export type ExpenseFormValues = z.infer<typeof expenseSchema>
export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>
export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>
