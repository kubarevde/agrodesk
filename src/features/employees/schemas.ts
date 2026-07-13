import { z } from 'zod'

export const employeeSchema = z.object({
  employeeName: z.string().min(1, 'Укажите ФИО'),
  position: z.string().min(1, 'Укажите должность'),
  hourlyRate: z.number().min(0, 'Ставка не может быть отрицательной'),
  telegramId: z.string().optional(),
  role: z.enum(['admin', 'manager', 'employee']),
})

export type EmployeeFormValues = z.infer<typeof employeeSchema>
