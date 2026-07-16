import type { Expense } from '@/types'
import { formatMoney as formatMoneyBase } from '@/lib/format'
import {
  LEGACY_EXPENSE_CATEGORY_LABELS,
  resolveDictionaryLabel,
  type DictionaryLabelRow,
} from '@/features/dictionaries/labels'

/** @deprecated use LEGACY_EXPENSE_CATEGORY_LABELS — re-export for older imports */
export const CATEGORY_LABELS = LEGACY_EXPENSE_CATEGORY_LABELS

const CATEGORY_COLOR_LIST = [
  '#01696F',
  '#437A22',
  '#DA7101',
  '#7A7974',
  '#4A90D9',
  '#A13544',
  '#8B5CF6',
  '#0D9488',
]

export const CATEGORY_COLORS: Record<string, string> = {
  fuel: '#01696F',
  fertilizer: '#437A22',
  parts: '#DA7101',
  salary: '#7A7974',
  rent: '#4A90D9',
  other: '#A13544',
}

export function getCategoryLabel(
  category: string,
  dictionary?: DictionaryLabelRow[],
): string {
  return resolveDictionaryLabel(category, dictionary, LEGACY_EXPENSE_CATEGORY_LABELS)
}

export function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category]
  let hash = 0
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash + category.charCodeAt(i) * (i + 1)) % CATEGORY_COLOR_LIST.length
  }
  return CATEGORY_COLOR_LIST[Math.abs(hash) % CATEGORY_COLOR_LIST.length]
}

export const PAYMENT_METHODS = ['cash', 'transfer', 'invoice'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  transfer: 'Перевод',
  invoice: 'Счёт',
}

export function formatMoney(value: number): string {
  return formatMoneyBase(value)
}

export function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'fuel':
      return 'border-primary/30 bg-primary/10 text-primary'
    case 'fertilizer':
      return 'border-success/30 bg-success/10 text-success'
    case 'parts':
      return 'border-[#DA7101]/30 bg-[#DA7101]/10 text-[#DA7101]'
    case 'salary':
      return 'border-border bg-muted text-muted-foreground'
    case 'rent':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    default:
      return 'border-border bg-muted text-foreground'
  }
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}

export function findLargestCategory(
  expenses: Expense[],
): { category: string; amount: number } | null {
  const map = new Map<string, number>()

  for (const expense of expenses) {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount)
  }

  let largest: { category: string; amount: number } | null = null
  for (const [category, amount] of map.entries()) {
    if (!largest || amount > largest.amount) {
      largest = { category, amount }
    }
  }
  return largest
}

export function groupExpensesByCategory(
  expenses: Expense[],
): Array<{ category: string; amount: number; percent: number }> {
  const total = sumExpenses(expenses)
  const map = new Map<string, number>()

  for (const expense of expenses) {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount)
  }

  return Array.from(map.entries()).map(([category, amount]) => ({
    category,
    amount,
    percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
  }))
}
