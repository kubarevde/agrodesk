import type { Expense } from '@/types'
import { formatMoney as formatMoneyBase } from '@/lib/format'

export const EXPENSE_CATEGORIES = [
  'fuel',
  'fertilizer',
  'parts',
  'salary',
  'rent',
  'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: 'Топливо',
  fertilizer: 'Удобрения',
  parts: 'Запчасти',
  salary: 'Зарплата',
  rent: 'Аренда',
  other: 'Прочее',
}

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  fuel: '#01696F',
  fertilizer: '#437A22',
  parts: '#DA7101',
  salary: '#7A7974',
  rent: '#4A90D9',
  other: '#A13544',
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

export function getCategoryBadgeClass(category: ExpenseCategory): string {
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
      return 'border-destructive/30 bg-destructive/10 text-destructive'
  }
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}

export function findLargestCategory(
  expenses: Expense[],
): { category: ExpenseCategory; amount: number } | null {
  const map = new Map<ExpenseCategory, number>()

  for (const expense of expenses) {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount)
  }

  let largest: { category: ExpenseCategory; amount: number } | null = null
  for (const [category, amount] of map.entries()) {
    if (!largest || amount > largest.amount) {
      largest = { category, amount }
    }
  }
  return largest
}

export function groupExpensesByCategory(
  expenses: Expense[],
): Array<{ category: ExpenseCategory; amount: number; percent: number }> {
  const total = sumExpenses(expenses)
  const map = new Map<ExpenseCategory, number>()

  for (const expense of expenses) {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount)
  }

  return Array.from(map.entries()).map(([category, amount]) => ({
    category,
    amount,
    percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
  }))
}
