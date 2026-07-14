import { z } from 'zod'

export const employeeFormSchema = z.object({
  employeeCode: z.string().min(1, 'Укажите код'),
  employeeName: z.string().min(1, 'Укажите ФИО'),
  position: z.string(),
  hourlyRate: z.number().min(0, 'Ставка не может быть отрицательной'),
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
