import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Укажите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

const orgSharedFields = {
  name: z.string().min(1, 'Укажите название'),
  slug: z
    .string()
    .min(1, 'Укажите адрес организации')
    .regex(/^[a-z0-9\-]+$/, 'Только латиница, цифры и дефис'),
  plan: z.enum(['trial', 'basic', 'pro']),
  maxEmployees: z.number().int().min(1, 'Минимум 1'),
  trialEndsAt: z.string().nullable(),
  isActive: z.boolean(),
  marketplaceEnabled: z.boolean(),
  region: z.string().nullable(),
}

export const orgCreateSchema = z.object({
  ...orgSharedFields,
  ownerEmail: z.string().email('Укажите корректный email'),
})

export const orgEditSchema = z.object({
  ...orgSharedFields,
  ownerEmail: z.string(),
})

export const orgFormSchema = orgCreateSchema

export type OrgFormValues = z.infer<typeof orgCreateSchema>

export const ORG_FORM_DEFAULTS: OrgFormValues = {
  name: '',
  slug: '',
  ownerEmail: '',
  plan: 'trial',
  maxEmployees: 10,
  trialEndsAt: null,
  isActive: true,
  marketplaceEnabled: false,
  region: null,
}

/** Build PATCH payload — never sends name/slug/owner; marketplace is explicit. */
export function buildOrgUpdatePayload(values: OrgFormValues) {
  return {
    plan: values.plan,
    maxEmployees: values.maxEmployees,
    trialEndsAt: values.trialEndsAt,
    isActive: values.isActive,
    marketplaceEnabled: values.marketplaceEnabled,
    region: values.region,
  }
}

export function hierarchyRoleLabel(opts: {
  parentName: string | null
  childrenCount: number
}): string {
  if (opts.parentName) return `Дочерняя → ${opts.parentName}`
  if (opts.childrenCount > 0) return `Головная · ${opts.childrenCount} КФХ`
  return 'Самостоятельная'
}
