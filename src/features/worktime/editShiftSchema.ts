import { z } from 'zod'

export const editShiftSchema = z.object({
  location: z.string().min(1, 'Выберите объект'),
  workType: z.string().min(1, 'Выберите тип работ'),
  equipment: z.string().optional(),
  description: z.string().optional(),
  comment: z.string().max(300).optional(),
})

export type EditShiftFormValues = z.infer<typeof editShiftSchema>
