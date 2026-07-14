import { z } from 'zod'

const baseOpenShiftSchema = z.object({
  location: z.string().min(1, 'Выберите объект'),
  workType: z.string().min(1, 'Выберите тип работ'),
  equipment: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  employeeId: z.string().optional(),
})

export const openShiftSchema = baseOpenShiftSchema

export const openShiftForEmployeeSchema = baseOpenShiftSchema.extend({
  employeeId: z.string().min(1, 'Выберите сотрудника'),
})

export type OpenShiftFormValues = z.infer<typeof baseOpenShiftSchema>
