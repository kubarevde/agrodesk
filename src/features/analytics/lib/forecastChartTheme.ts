/**
 * Forecast chart visual system — design tokens for fact vs forecast series.
 *
 * Semantic groups:
 * - Income (доходы): teal / success cluster
 * - Expenses (затраты): destructive / amber cluster
 * - Fact: solid, opaque
 * - Forecast: dashed, slightly lighter
 * - Uncertainty band: muted fill, never competes with lines
 */

export const FORECAST_CHART_COLORS = {
  /** Доходы — факт (сплошная) */
  incomeFact: 'var(--chart-1, #01696F)',
  /** Доходы — прогноз (пунктир, success) */
  incomeForecast: 'var(--chart-2, #437A22)',
  /** Затраты — факт (сплошная) */
  expensesFact: 'var(--chart-5, #A13544)',
  /** Затраты — прогноз (пунктир, amber — отдельно от факта) */
  expensesForecast: '#DA7101',
  /** Диапазон неопределённости затрат */
  expensesRange: 'var(--chart-3, #7A7974)',
  /** Разделитель факт / прогноз */
  divider: 'var(--muted-foreground, #7A7974)',
} as const

export const FORECAST_CHART_SERIES = [
  { key: 'income', name: 'Доходы — факт', color: FORECAST_CHART_COLORS.incomeFact, kind: 'fact' },
  {
    key: 'incomeForecast',
    name: 'Доходы — прогноз',
    color: FORECAST_CHART_COLORS.incomeForecast,
    kind: 'forecast',
  },
  {
    key: 'expenses',
    name: 'Затраты — факт',
    color: FORECAST_CHART_COLORS.expensesFact,
    kind: 'fact',
  },
  {
    key: 'expensesForecast',
    name: 'Затраты — прогноз',
    color: FORECAST_CHART_COLORS.expensesForecast,
    kind: 'forecast',
  },
  {
    key: 'expensesRange',
    name: 'Диапазон прогноза затрат',
    color: FORECAST_CHART_COLORS.expensesRange,
    kind: 'range',
  },
] as const
