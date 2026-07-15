import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Введите email или код сотрудника'),
  password: z.string().min(1, 'Введите пароль'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
