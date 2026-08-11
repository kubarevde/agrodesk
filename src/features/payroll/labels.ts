import { format, isValid, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type {
  AdjustmentType,
  PaymentScheme,
  PayrollStatus,
  PayoutStatus,
} from './types'

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'Черновик',
  confirmed: 'Подтверждено',
  paid: 'Выдано',
}

export const SCHEME_LABELS: Record<PaymentScheme, string> = {
  hourly: 'Почасовая',
  per_shift: 'Посменная',
  monthly: 'Оклад',
  piecework: 'Сдельная',
}

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  bonus: 'Премия',
  penalty: 'Штраф',
  deduction: 'Удержание',
  other: 'Другое',
}

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  unpaid: 'Не выдано',
  partially_paid: 'Выдано частично',
  paid: 'Выдано',
}

/** Human-readable accrual period, e.g. «1–31 августа 2026». */
export function formatPayrollPeriod(start: string, end: string): string {
  const a = parseISO(start)
  const b = parseISO(end)
  if (!isValid(a) || !isValid(b)) return '—'
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${format(a, 'd', { locale: ru })}–${format(b, 'd MMMM yyyy', { locale: ru })}`
  }
  return `${format(a, 'd MMMM yyyy', { locale: ru })} — ${format(b, 'd MMMM yyyy', { locale: ru })}`
}

export function schemeLabel(scheme: string | null | undefined): string {
  if (!scheme) return '—'
  return SCHEME_LABELS[scheme as PaymentScheme] ?? '—'
}

export function payrollStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return PAYROLL_STATUS_LABELS[status as PayrollStatus] ?? '—'
}

export function payoutStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return PAYOUT_STATUS_LABELS[status as PayoutStatus] ?? '—'
}

export function adjustmentTypeLabel(type: string | null | undefined): string {
  if (!type) return '—'
  return ADJUSTMENT_TYPE_LABELS[type as AdjustmentType] ?? '—'
}

/** Permission keys → short Russian phrases for UI tooltips (not action codes). */
export const PAYROLL_ACTION_HINTS = {
  confirm: 'Нужно право подтверждать начисление зарплаты',
  pay: 'Нужно право фиксировать выдачу зарплаты',
  manageRates: 'Нужно право управлять ставками и схемами',
  viewAll: 'Нужно право видеть начисления всех сотрудников',
} as const
