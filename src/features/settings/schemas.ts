import { z } from 'zod'

export const locationSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  description: z.string().optional(),
  isActive: z.boolean(),
})

export const workTypeSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  category: z.string().optional(),
  isActive: z.boolean(),
})

export const equipmentSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  type: z.string().optional(),
  isActive: z.boolean(),
})

export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  category: z.enum(['fuel', 'fertilizer', 'parts', 'seeds', 'chemicals', 'other']),
  unit: z.string().min(1, 'Укажите единицу измерения'),
  currentStock: z.number().min(0),
  minStock: z.number().min(0),
  totalCapacity: z.number().min(0),
  isActive: z.boolean(),
})

export type LocationFormValues = z.infer<typeof locationSchema>
export type WorkTypeFormValues = z.infer<typeof workTypeSchema>
export type EquipmentFormValues = z.infer<typeof equipmentSchema>
export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>
