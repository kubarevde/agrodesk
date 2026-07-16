import { z } from 'zod'

export const fieldFormSchema = z.object({
  name: z.string().min(1, 'Укажите название поля').transform((value) => value.trim()),
  crop_type: z.string().optional(),
  area_ha: z.number().min(0).optional(),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export type FieldFormValues = z.infer<typeof fieldFormSchema>
