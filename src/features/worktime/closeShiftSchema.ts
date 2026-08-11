import { z } from 'zod'

export const PIECEWORK_UNITS = ['га', 'т', 'кг', 'шт', 'л', 'м²'] as const

export type PieceworkUnit = (typeof PIECEWORK_UNITS)[number]

const baseCloseShiftSchema = z.object({
  description: z
    .string()
    .min(5, 'Минимум 5 символов')
    .max(500, 'Максимум 500 символов'),
  comment: z.string().max(300).optional(),
  quantity: z.number().positive('Объём должен быть больше 0').optional(),
  unit: z.enum(PIECEWORK_UNITS).optional(),
})

export type CloseShiftFormValues = z.infer<typeof baseCloseShiftSchema>

/** Build schema; quantity/unit required only for piecework employees. */
export function buildCloseShiftSchema(requiresPiecework: boolean) {
  if (!requiresPiecework) {
    return baseCloseShiftSchema
  }
  return baseCloseShiftSchema.superRefine((values, ctx) => {
    if (values.quantity == null || Number.isNaN(values.quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите объём выработки',
        path: ['quantity'],
      })
    }
    if (!values.unit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите единицу измерения',
        path: ['unit'],
      })
    }
  })
}

export const closeShiftSchema = buildCloseShiftSchema(false)
