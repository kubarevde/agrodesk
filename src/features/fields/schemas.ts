import { z } from 'zod'
import { CROP_OPTIONS, SOIL_OPTIONS } from './types'

export const fieldFormSchema = z.object({
  name: z.string().min(1, 'Укажите название поля'),
  crop_type: z.enum(CROP_OPTIONS).optional(),
  area_ha: z.number().min(0).optional(),
  soil_type: z.enum(SOIL_OPTIONS).optional(),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export type FieldFormValues = z.infer<typeof fieldFormSchema>
