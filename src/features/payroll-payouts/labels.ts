import type { PayoutKind, PayoutMethod, PayoutStatus } from './types'

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  cash: 'Наличные',
  bank_transfer: 'Банковский перевод',
  card: 'На карту',
  other: 'Другое',
}

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  unpaid: 'Не выдано',
  partially_paid: 'Выдано частично',
  paid: 'Выдано',
}

export const PAYOUT_KIND_LABELS: Record<PayoutKind, string> = {
  advance: 'Аванс',
  salary_payment: 'Выплата зарплаты',
}

export function payoutMethodLabel(method: string | null | undefined): string {
  if (!method) return '—'
  return PAYOUT_METHOD_LABELS[method as PayoutMethod] ?? '—'
}

export function payoutKindLabel(kind: string | null | undefined): string {
  if (!kind) return '—'
  return PAYOUT_KIND_LABELS[kind as PayoutKind] ?? '—'
}

export function payoutStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return PAYOUT_STATUS_LABELS[status as PayoutStatus] ?? '—'
}
