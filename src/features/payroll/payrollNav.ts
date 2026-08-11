import type { PayrollSubTab } from './types'

export const PAYROLL_SUB_OPTIONS: { value: PayrollSubTab; label: string }[] = [
  { value: 'accruals', label: 'Начисления' },
  { value: 'payouts', label: 'Выдача ЗП' },
  { value: 'rates', label: 'Ставки и схемы' },
  { value: 'reports', label: 'Контроль и отчётность' },
]
