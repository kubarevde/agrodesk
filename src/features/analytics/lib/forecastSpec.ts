/**
 * Module specification: what the forecast analytics page measures.
 *
 * DATA SOURCES (backend get_monthly_history):
 * - Доходы (total_income): Shipments → quantity_kg * price_per_kg
 * - Затраты (total_expenses): Expense.amount (модуль «Расходы»)
 * - Прибыль: income − expenses
 * - Категории затрат: Expense.category → org dictionary expense_category
 * - Смены (total_shift_cost): Shift.calculated_amount — учитываются как метрика,
 *   но НЕ входят в total_expenses (зарплата в прогнозе только если есть Expense category=salary)
 * - ТО (total_maintenance_cost): EquipmentMaintenance.cost — отдельно;
 *   часто дублируется Expense category=parts через maintenance_expense
 * - Склад: только critical_inventory_count (текущий снимок), не денежный расход
 *
 * CATEGORY FORECAST («Прогноз по категориям расходов»):
 * - Строится ТОЛЬКО из Expense rows, сгруппированных по category
 * - Не из inventory consumption и не из shipments
 * - «Может вырасти» = predicted > last_month (growth_pct > 0)
 *
 * FORECAST INTERVALS:
 * - Model-specific CI / residual band on expenses (and income separately in API)
 * - Chart shows expenses uncertainty band only
 */

import { LEGACY_EXPENSE_CATEGORY_LABELS } from '@/features/dictionaries/labels'
import type { CategoryForecast, ForecastHistoryRow } from '../types'

export const FORECAST_DATA_SOURCES = {
  income: 'Отгрузки (quantity_kg × price_per_kg)',
  expenses: 'Расходы (Expense.amount)',
  expenseCategories: 'Расходы.категория (справочник expense_category)',
  notIncludedInExpenses: [
    'Смены (calculated_amount) — отдельно',
    'Склад / списание ТМЦ — не денежный ряд',
    'Inventory category seeds/chemicals — только если оформлены как Expense',
  ],
} as const

export type CategoryInsightRow = {
  category: string
  label: string
  predicted: number
  lastMonth: number
  growthPct: number | null
  mayGrow: boolean
  monthsWithData: number
  lowConfidence: boolean
  reason: string
}

export function buildCategoryInsights(
  rows: CategoryForecast[],
  history: ForecastHistoryRow[],
  getLabel: (code: string) => string,
): CategoryInsightRow[] {
  const last = history[history.length - 1]
  const insights: CategoryInsightRow[] = []

  for (const row of rows) {
    if (row.predictedValue == null) continue
    const predicted = row.predictedValue
    const lastMonth =
      row.lastMonthValue ??
      (last?.byCategory?.[row.category] != null ? Number(last.byCategory[row.category]) : 0)
    const growthPct =
      row.growthPct ??
      (lastMonth > 0
        ? Math.round(((predicted - lastMonth) / lastMonth) * 1000) / 10
        : predicted > 0
          ? 100
          : null)
    const monthsWithData = row.monthsWithData ?? 0
    const mayGrow = growthPct != null && growthPct > 5 && predicted > 0
    const lowConfidence = monthsWithData < 3 || Boolean(row.insufficientData)

    let reason: string
    if (predicted <= 0 && lastMonth <= 0) {
      reason = 'По этой категории расходов почти нет — прогноз не строится.'
    } else if (lowConfidence) {
      reason = `Мало месяцев с расходами (${monthsWithData}). Оценка ориентировочная.`
    } else if (mayGrow) {
      reason = `Прогноз выше последнего месяца на ${Math.round(growthPct ?? 0)}% по данным модуля «Расходы».`
    } else if (growthPct != null && growthPct < -5) {
      reason = `Прогноз ниже последнего месяца примерно на ${Math.abs(Math.round(growthPct))}%.`
    } else {
      reason = 'Ожидаемый уровень близок к последнему месяцу.'
    }

    // Skip empty noise
    if (predicted <= 0 && lastMonth <= 0) continue

    insights.push({
      category: row.category,
      label: getLabel(row.category) || LEGACY_EXPENSE_CATEGORY_LABELS[row.category] || row.category,
      predicted,
      lastMonth,
      growthPct,
      mayGrow,
      monthsWithData,
      lowConfidence,
      reason,
    })
  }

  return insights.sort((a, b) => {
    if (a.mayGrow !== b.mayGrow) return a.mayGrow ? -1 : 1
    return b.predicted - a.predicted
  })
}
