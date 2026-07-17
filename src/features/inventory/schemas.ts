import { z } from 'zod'

const requiredNumber = (message: string) =>
  z.number({ required_error: message, invalid_type_error: message })

export const incomeSchema = z.object({
  itemId: z.string().min(1, 'Выберите наименование'),
  quantity: requiredNumber('Укажите количество').positive('Укажите количество больше 0'),
  supplier: z.string().min(1, 'Укажите поставщика'),
  cost: requiredNumber('Укажите стоимость').min(0, 'Стоимость не может быть отрицательной'),
  date: z.string().min(1, 'Выберите дату'),
})

export const expenseSchema = z.object({
  itemId: z.string().min(1, 'Выберите наименование'),
  quantity: requiredNumber('Укажите количество').positive('Укажите количество больше 0'),
  reason: z.string().min(1, 'Укажите причину списания'),
})

export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  category: z.string().min(1, 'Выберите категорию'),
  unit: z.string().min(1, 'Укажите единицу измерения'),
  currentStock: requiredNumber('Укажите остаток').min(0, 'Остаток не может быть отрицательным'),
  minStock: requiredNumber('Укажите мин. запас').min(0, 'Мин. запас не может быть отрицательным'),
  totalCapacity: requiredNumber('Укажите ёмкость').min(0, 'Ёмкость не может быть отрицательной'),
  isActive: z.boolean(),
})

export type IncomeFormValues = z.infer<typeof incomeSchema>
export type ExpenseFormValues = z.infer<typeof expenseSchema>
export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>
