import { z } from 'zod'

export const incomeSchema = z.object({
  itemId: z.string().min(1, 'Выберите наименование'),
  quantity: z.number().positive('Укажите количество больше 0'),
  supplier: z.string().min(1, 'Укажите поставщика'),
  cost: z.number().min(0, 'Стоимость не может быть отрицательной'),
  date: z.string().min(1, 'Выберите дату'),
})

export const expenseSchema = z.object({
  itemId: z.string().min(1, 'Выберите наименование'),
  quantity: z.number().positive('Укажите количество больше 0'),
  reason: z.string().min(1, 'Укажите причину списания'),
})

export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  category: z.string().min(1, 'Выберите категорию'),
  unit: z.string().min(1, 'Укажите единицу измерения'),
  currentStock: z.number().min(0),
  minStock: z.number().min(0),
  totalCapacity: z.number().min(0),
  isActive: z.boolean(),
})

export type IncomeFormValues = z.infer<typeof incomeSchema>
export type ExpenseFormValues = z.infer<typeof expenseSchema>
export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>
