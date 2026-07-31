import { z } from 'zod'

/** Form values after client-side parseCoord (never NaN). */
export const fieldFormSchema = z
  .object({
    name: z.string().min(1, 'Укажите название поля').transform((value) => value.trim()),
    crop_type: z.string().optional(),
    crop_code: z.string().optional(),
    area_ha: z.number().min(0, 'Площадь не может быть меньше 0').optional(),
    description: z.string().optional(),
    latitude: z.number().min(-90, 'Широта: от −90 до 90').max(90, 'Широта: от −90 до 90').optional(),
    longitude: z
      .number()
      .min(-180, 'Долгота: от −180 до 180')
      .max(180, 'Долгота: от −180 до 180')
      .optional(),
    polygon: z.array(z.array(z.number()).min(2).max(2)).nullable().optional(),
  })
  .superRefine((values, ctx) => {
    const hasLat = values.latitude !== undefined
    const hasLng = values.longitude !== undefined
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: 'custom',
        message: 'Укажите и широту, и долготу — или оставьте оба поля пустыми',
        path: hasLat ? ['longitude'] : ['latitude'],
      })
    }
  })

export type FieldFormValues = z.infer<typeof fieldFormSchema>
