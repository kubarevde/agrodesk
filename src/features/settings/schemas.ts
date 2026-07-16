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

export type LocationFormValues = z.infer<typeof locationSchema>
export type WorkTypeFormValues = z.infer<typeof workTypeSchema>
