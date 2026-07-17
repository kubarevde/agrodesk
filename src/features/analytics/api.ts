import { api } from '@/lib/api'
import type {
  CategoryForecast,
  ForecastHistoryRow,
  ForecastResponse,
  Recommendation,
} from './types'

type ApiRecord = Record<string, unknown>

function historyFromApi(raw: ApiRecord): ForecastHistoryRow {
  const byCategoryRaw =
    raw.by_category && typeof raw.by_category === 'object'
      ? (raw.by_category as Record<string, unknown>)
      : {}
  const byCategory: Record<string, number> = {}
  for (const [key, value] of Object.entries(byCategoryRaw)) {
    byCategory[key] = Number(value ?? 0)
  }
  return {
    month: String(raw.month ?? ''),
    totalExpenses: Number(raw.total_expenses ?? 0),
    totalIncome: Number(raw.total_income ?? 0),
    totalMargin: Number(raw.total_margin ?? 0),
    totalShiftCost: Number(raw.total_shift_cost ?? 0),
    totalMaintenanceCost: Number(raw.total_maintenance_cost ?? 0),
    criticalInventoryCount: Number(raw.critical_inventory_count ?? 0),
    plannedWorkload: Number(raw.planned_workload ?? 0),
    byCategory,
  }
}

function forecastFromApi(raw: ApiRecord): ForecastResponse['forecast'] {
  const intervals = (raw.intervals as ApiRecord | undefined) ?? {}
  return {
    predictedExpenses:
      raw.predicted_expenses == null ? null : Number(raw.predicted_expenses),
    predictedIncome: raw.predicted_income == null ? null : Number(raw.predicted_income),
    predictedMargin: raw.predicted_margin == null ? null : Number(raw.predicted_margin),
    confidenceNote: String(raw.confidence_note ?? ''),
    modelUsedExpenses: raw.model_used_expenses != null ? String(raw.model_used_expenses) : null,
    modelUsedIncome: raw.model_used_income != null ? String(raw.model_used_income) : null,
    modelUsedMargin: raw.model_used_margin != null ? String(raw.model_used_margin) : null,
    selectionReasonExpenses:
      raw.selection_reason_expenses != null ? String(raw.selection_reason_expenses) : null,
    selectionReasonIncome:
      raw.selection_reason_income != null ? String(raw.selection_reason_income) : null,
    intervals: {
      expensesLower: intervals.expenses_lower == null ? null : Number(intervals.expenses_lower),
      expensesUpper: intervals.expenses_upper == null ? null : Number(intervals.expenses_upper),
      incomeLower: intervals.income_lower == null ? null : Number(intervals.income_lower),
      incomeUpper: intervals.income_upper == null ? null : Number(intervals.income_upper),
    },
    insufficientData: Boolean(raw.insufficient_data),
    disclaimer: raw.disclaimer != null ? String(raw.disclaimer) : null,
    monthsUsed: Number(raw.months_used ?? 0),
    backtestMetrics:
      raw.backtest_metrics && typeof raw.backtest_metrics === 'object'
        ? (raw.backtest_metrics as Record<string, unknown>)
        : {},
  }
}

export async function fetchForecast(params?: {
  monthsAhead?: number
  method?: string
}): Promise<ForecastResponse> {
  const { data } = await api.get<ApiRecord>('/api/analytics/forecast', {
    params: {
      months_ahead: params?.monthsAhead ?? 1,
      method: params?.method ?? 'auto',
    },
  })
  const history = Array.isArray(data.history)
    ? data.history.map((row) => historyFromApi(row as ApiRecord))
    : []
  const byCategory: CategoryForecast[] = Array.isArray(data.by_category)
    ? data.by_category.map((row) => {
        const item = row as ApiRecord
        return {
          category: String(item.category ?? ''),
          predictedValue:
            item.predicted_value == null ? null : Number(item.predicted_value),
          modelName: item.model_name != null ? String(item.model_name) : null,
          insufficientData: Boolean(item.insufficient_data),
          lastMonthValue:
            item.last_month_value == null ? null : Number(item.last_month_value),
          growthPct: item.growth_pct == null ? null : Number(item.growth_pct),
          monthsWithData:
            item.months_with_data == null ? undefined : Number(item.months_with_data),
        }
      })
    : []
  const modelCandidates = Array.isArray(data.model_candidates)
    ? data.model_candidates.map((row) => {
        const item = row as ApiRecord
        return {
          id: String(item.id ?? ''),
          label: String(item.label ?? ''),
          available: Boolean(item.available),
        }
      })
    : []
  return {
    history,
    forecast: forecastFromApi((data.forecast as ApiRecord) ?? {}),
    byCategory,
    modelCandidates,
  }
}

export async function fetchRecommendations(): Promise<Recommendation[]> {
  const { data } = await api.get<ApiRecord[]>('/api/analytics/recommendations')
  if (!Array.isArray(data)) return []
  return data.map((row) => ({
    title: String(row.title ?? ''),
    explanation: String(row.explanation ?? ''),
    level: String(row.level ?? 'info'),
    whyNumbers:
      row.why_numbers && typeof row.why_numbers === 'object'
        ? (row.why_numbers as Record<string, unknown>)
        : {},
    suggestedAction: String(row.suggested_action ?? ''),
    relatedEntityType: row.related_entity_type != null ? String(row.related_entity_type) : null,
    relatedEntityId: row.related_entity_id != null ? String(row.related_entity_id) : null,
  }))
}
