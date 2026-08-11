import { z } from 'zod'

export const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Минимум 3 символа')
      .max(200, 'Максимум 200 символов'),
    description: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
    visibilityType: z.enum(['all_employees', 'specific_employee']),
    assigneeId: z.string().optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (values.visibilityType === 'specific_employee' && !values.assigneeId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Выберите сотрудника',
        path: ['assigneeId'],
      })
    }
  })

export type TaskFormValues = z.infer<typeof taskFormSchema>

export const taskCancelSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(5, 'Укажите причину (не менее 5 символов)')
    .max(2000),
})

export type TaskCancelValues = z.infer<typeof taskCancelSchema>
