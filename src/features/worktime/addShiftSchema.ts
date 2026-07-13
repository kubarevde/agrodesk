import { z } from 'zod'
import { calcShiftDurationMinutes } from './utils'

export const addShiftSchema = z
  .object({
    employeeId: z.string().min(1, 'Выберите сотрудника'),
    startDate: z.string().min(1, 'Выберите дату начала'),
    startTime: z.string().min(1, 'Выберите время начала'),
    endDate: z.string().min(1, 'Выберите дату окончания'),
    endTime: z.string().min(1, 'Выберите время окончания'),
    location: z.string().min(1, 'Выберите объект'),
    workType: z.string().min(1, 'Выберите тип работ'),
    equipment: z.string().optional(),
    description: z.string().min(1, 'Заполните описание'),
    comment: z.string().max(300).optional(),
  })
  .superRefine((values, ctx) => {
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

export type AddShiftFormValues = z.infer<typeof addShiftSchema>
