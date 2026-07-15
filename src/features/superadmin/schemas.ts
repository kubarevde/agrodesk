import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Укажите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const orgFormSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  slug: z
    .string()
    .min(1, 'Укажите slug')
    .regex(/^[a-z0-9\-]+$/, 'Только латиница, цифры и дефис'),
  ownerEmail: z.string().email('Укажите корректный email'),
  plan: z.enum(['trial', 'basic', 'pro']),
  maxEmployees: z.number().int().min(1, 'Минимум 1'),
  trialEndsAt: z.string().nullable(),
})

export type OrgFormValues = z.infer<typeof orgFormSchema>
