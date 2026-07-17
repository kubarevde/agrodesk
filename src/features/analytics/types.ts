export type ForecastHistoryRow = {
  month: string
  totalExpenses: number
  totalIncome: number
  totalMargin: number
  totalShiftCost: number
  totalMaintenanceCost: number
  criticalInventoryCount: number
  plannedWorkload: number
  byCategory: Record<string, number>
}

export type ForecastBlock = {
  predictedExpenses: number | null
  predictedIncome: number | null
  predictedMargin: number | null
  confidenceNote: string
  modelUsedExpenses: string | null
  modelUsedIncome: string | null
  modelUsedMargin: string | null
  selectionReasonExpenses: string | null
  selectionReasonIncome: string | null
  intervals: {
    expensesLower: number | null
    expensesUpper: number | null
    incomeLower: number | null
    incomeUpper: number | null
  }
  insufficientData: boolean
  disclaimer: string | null
  monthsUsed: number
  backtestMetrics: Record<string, unknown>
}

export type CategoryForecast = {
  category: string
  predictedValue: number | null
  modelName: string | null
  insufficientData?: boolean
  lastMonthValue?: number | null
  growthPct?: number | null
  monthsWithData?: number
}

export type ForecastResponse = {
  history: ForecastHistoryRow[]
  forecast: ForecastBlock
  byCategory: CategoryForecast[]
  modelCandidates: Array<{ id: string; label: string; available: boolean }>
}

export type Recommendation = {
  title: string
  explanation: string
  level: 'info' | 'warning' | 'critical' | string
  whyNumbers: Record<string, unknown>
  suggestedAction: string
  relatedEntityType: string | null
  relatedEntityId: string | null
}

/** @deprecated Prefer getCategoryLabel + expense_category dictionary */
export { LEGACY_EXPENSE_CATEGORY_LABELS as CATEGORY_LABELS } from '@/features/dictionaries/labels'
