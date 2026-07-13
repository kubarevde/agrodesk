import { z } from 'zod'

export const openShiftSchema = z.object({
  location: z.string().min(1, 'Выберите объект'),
  workType: z.string().min(1, 'Выберите тип работ'),
  equipment: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
})

export type OpenShiftFormValues = z.infer<typeof openShiftSchema>
