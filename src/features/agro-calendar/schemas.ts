import { z } from 'zod'

export const agroPlanFormSchema = z.object({
  plannedDate: z.string().min(1, 'Укажите дату начала'),
  plannedEndDate: z.string().optional(),
  fieldIds: z.array(z.string()).min(1, 'Выберите хотя бы одно поле'),
  workTypeId: z.string().min(1, 'Выберите тип работы'),
  equipmentId: z.string().optional(),
  implementId: z.string().optional(),
  employeeId: z.string().optional(),
  notes: z.string().optional(),
})

export type AgroPlanFormValues = z.infer<typeof agroPlanFormSchema>
