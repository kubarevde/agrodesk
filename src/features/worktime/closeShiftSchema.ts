import { z } from 'zod'

export const closeShiftSchema = z.object({
  description: z
    .string()
    .min(5, 'Минимум 5 символов')
    .max(500, 'Максимум 500 символов'),
  comment: z.string().max(300).optional(),
})

export type CloseShiftFormValues = z.infer<typeof closeShiftSchema>
