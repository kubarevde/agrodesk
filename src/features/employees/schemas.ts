import { z } from 'zod'

export const employeeFormSchema = z.object({
  employeeCode: z.string().min(1, 'Укажите код'),
  employeeName: z.string().min(1, 'Укажите ФИО'),
  position: z.string(),
  hourlyRate: z.number({ error: 'Укажите ставку' }).min(0, 'Ставка не может быть отрицательной'),
  role: z.enum(['admin', 'manager', 'employee']),
  password: z.string(),
  isActive: z.boolean(),
})

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>

export function getEmployeeSchema(isEdit: boolean) {
  return employeeFormSchema.superRefine((values, ctx) => {
    if (!isEdit && values.password.length < 4) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Пароль не короче 4 символов',
      })
      return
    }

    if (isEdit && values.password.length > 0 && values.password.length < 4) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Пароль не короче 4 символов',
      })
    }
  })
}

export const employeeRateFormSchema = z
  .object({
    workTypeId: z.string().nullable(),
    rate: z.number({ error: 'Укажите ставку' }).min(0, 'Ставка не может быть отрицательной'),
    overtimeThresholdHours: z
      .number({ error: 'Укажите порог' })
      .min(0, 'Порог не может быть отрицательным'),
    overtimeMultiplier: z
      .number({ error: 'Укажите множитель' })
      .min(0, 'Множитель не может быть отрицательным'),
    validFrom: z.string().min(1, 'Укажите дату начала'),
    validTo: z.string().nullable(),
    notes: z.string().nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({
        code: 'custom',
        path: ['validTo'],
        message: 'Дата окончания не раньше начала',
      })
    }
  })

export type EmployeeRateFormValues = z.infer<typeof employeeRateFormSchema>
