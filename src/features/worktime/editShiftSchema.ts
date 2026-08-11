import { z } from 'zod'
import { calcShiftDurationMinutes } from './utils'

export const editShiftSchema = z
  .object({
    startDate: z.string().min(1, 'Выберите дату начала'),
    startTime: z.string().min(1, 'Выберите время начала'),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    location: z.string().min(1, 'Выберите объект'),
    workType: z.string().min(1, 'Выберите тип работ'),
    equipment: z.string().optional(),
    description: z.string().optional(),
    comment: z.string().max(300).optional(),
    status: z.enum(['open', 'closed']),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'open') return

    if (!values.endDate?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Выберите дату окончания',
        path: ['endDate'],
      })
    }
    if (!values.endTime?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Выберите время окончания',
        path: ['endTime'],
      })
    }
    if (!values.endDate?.trim() || !values.endTime?.trim()) return

    const durationRaw = calcShiftDurationMinutes(
      values.startDate,
      values.startTime,
      values.endDate,
      values.endTime,
    )
    if (durationRaw <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Время окончания должно быть позже начала',
        path: ['endTime'],
      })
    }
  })

export type EditShiftFormValues = z.infer<typeof editShiftSchema>
