import type { PayrollControlAttentionGroup } from './controlTypes'

export type AttentionKind =
  | 'unpaid_confirmed'
  | 'draft_runs'
  | 'unlinked_advances'
  | 'missing_expense'
  | 'orphan_salary_expense'
  | 'overpaid'
  | 'inconsistent'

export type AttentionKindMeta = {
  title: string
  explanation: string
  actionLabel: string
  action: 'accruals' | 'payouts' | 'expenses'
}

export const ATTENTION_KIND_META: Record<AttentionKind, AttentionKindMeta> = {
  unpaid_confirmed: {
    title: 'Есть невыплаченная зарплата',
    explanation:
      'По подтверждённым начислениям остаётся сумма, которую ещё не выдали сотрудникам.',
    actionLabel: 'Перейти к выдаче ЗП',
    action: 'payouts',
  },
  draft_runs: {
    title: 'Черновик начисления ожидает подтверждения',
    explanation: 'Есть черновик начисления за период — его нужно проверить и подтвердить.',
    actionLabel: 'Открыть начисление',
    action: 'accruals',
  },
  unlinked_advances: {
    title: 'Аванс ожидает привязки',
    explanation:
      'Эти суммы уже выданы сотрудникам, но ещё не учтены в конкретном начислении.',
    actionLabel: 'Открыть выдачу ЗП',
    action: 'payouts',
  },
  missing_expense: {
    title: 'Начисление не проведено в расходы',
    explanation:
      'Есть подтверждённые начисления, для которых не создан расход в категории «Зарплата».',
    actionLabel: 'Открыть начисления',
    action: 'accruals',
  },
  orphan_salary_expense: {
    title: 'Расход на зарплату без связи с начислением',
    explanation:
      'В расходах есть запись по категории «Зарплата», которая была добавлена вручную и не связана с конкретным начислением сотрудника.',
    actionLabel: 'Открыть расходы',
    action: 'expenses',
  },
  overpaid: {
    title: 'Выдано больше, чем начислено',
    explanation:
      'По некоторым сотрудникам сумма авансов и выплат превышает подтверждённую сумму зарплаты.',
    actionLabel: 'Проверить выдачи',
    action: 'payouts',
  },
  inconsistent: {
    title: 'Запись требует проверки данных',
    explanation:
      'В системе найдены записи с неполными данными. Они не скрыты, чтобы можно было проверить информацию.',
    actionLabel: 'Открыть начисления',
    action: 'accruals',
  },
}

const TECH_PATTERN =
  /payroll[_ ]?run[_ ]?line|payroll[_ ]?run|\buuid\b|\bnull\b|\bundefined\b|\bapi\b|\bjson\b/i

export function isAttentionKind(value: string): value is AttentionKind {
  return value in ATTENTION_KIND_META
}

export function attentionTitle(kind: string, fallback?: string): string {
  if (isAttentionKind(kind)) return ATTENTION_KIND_META[kind].title
  if (fallback && !TECH_PATTERN.test(fallback)) return fallback
  return 'Требует проверки'
}

export function attentionExplanation(kind: string, fallback?: string): string {
  if (isAttentionKind(kind)) return ATTENTION_KIND_META[kind].explanation
  if (fallback && !TECH_PATTERN.test(fallback)) return fallback
  return 'Проверьте запись и связанные документы.'
}

export function sanitizeUserText(value: string | null | undefined, fallback: string): string {
  const text = (value ?? '').trim()
  if (!text) return fallback
  if (TECH_PATTERN.test(text)) return fallback
  return text
}

export function groupAmount(group: PayrollControlAttentionGroup): number {
  if (typeof group.amount === 'number' && Number.isFinite(group.amount)) return group.amount
  return group.items.reduce((sum, item) => {
    const value =
      item.remainder ?? item.overpay ?? item.amount ?? item.totalAmount ?? item.accrued ?? 0
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)
}
