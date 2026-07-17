import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FORECAST_CHART_COLORS } from '../lib/forecastChartTheme'
import { formatMonthLabel } from '../lib/forecastUi'
import type { ForecastBlock, ForecastHistoryRow } from '../types'

type ForecastChartProps = {
  history: ForecastHistoryRow[]
  forecast: ForecastBlock
}

type ChartRow = {
  month: string
  monthLabel: string
  expenses: number | null
  income: number | null
  margin: number | null
  expensesForecast: number | null
  incomeForecast: number | null
  /** Stacked band: base = lower bound */
  rangeBase: number | null
  /** Stacked band: span = upper − lower */
  rangeSpan: number | null
  isForecast: boolean
}

function money(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽'
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | null; payload: ChartRow }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {row.isForecast ? 'Прогноз' : 'Факт'}
      </p>
      {row.isForecast ? (
        <>
          <p style={{ color: FORECAST_CHART_COLORS.expensesForecast }}>
            Затраты (ожидаемо): {money(row.expensesForecast)}
          </p>
          <p style={{ color: FORECAST_CHART_COLORS.incomeForecast }}>
            Доходы (ожидаемо): {money(row.incomeForecast)}
          </p>
          {row.rangeBase != null && row.rangeSpan != null ? (
            <p className="text-muted-foreground">
              Диапазон затрат: {money(row.rangeBase)} — {money(row.rangeBase + row.rangeSpan)}
            </p>
          ) : null}
          <p>
            Прибыль (ожидаемо):{' '}
            {money(
              row.expensesForecast != null && row.incomeForecast != null
                ? row.incomeForecast - row.expensesForecast
                : null,
            )}
          </p>
        </>
      ) : (
        <>
          <p style={{ color: FORECAST_CHART_COLORS.expensesFact }}>
            Затраты: {money(row.expenses)}
          </p>
          <p style={{ color: FORECAST_CHART_COLORS.incomeFact }}>Доходы: {money(row.income)}</p>
          <p>Прибыль: {money(row.margin)}</p>
        </>
      )}
    </div>
  )
}

function buildChartData(
  history: ForecastHistoryRow[],
  forecast: ForecastBlock,
): { chartData: ChartRow[]; forecastMonthLabel: string | null; lastFactLabel: string | null } {
  const chartData: ChartRow[] = history.map((row) => ({
    month: row.month,
    monthLabel: formatMonthLabel(row.month),
    expenses: row.totalExpenses,
    income: row.totalIncome,
    margin: row.totalMargin,
    expensesForecast: null,
    incomeForecast: null,
    rangeBase: null,
    rangeSpan: null,
    isForecast: false,
  }))

  const lastFactLabel = chartData[chartData.length - 1]?.monthLabel ?? null
  let forecastMonthLabel: string | null = null

  if (forecast.insufficientData || forecast.predictedExpenses == null || history.length === 0) {
    return { chartData, forecastMonthLabel, lastFactLabel }
  }

  const last = history[history.length - 1]
  const [y, m] = last.month.split('-').map(Number)
  const d = new Date(y, m, 1)
  const forecastMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  forecastMonthLabel = formatMonthLabel(forecastMonth)

  // Bridge: connect dashed forecast line from last fact point
  const lastRow = chartData[chartData.length - 1]
  if (lastRow) {
    lastRow.expensesForecast = lastRow.expenses
    lastRow.incomeForecast = lastRow.income
  }

  const lower = forecast.intervals.expensesLower
  const upper = forecast.intervals.expensesUpper
  const rangeBase = lower != null ? Math.max(0, lower) : null
  const rangeSpan =
    lower != null && upper != null ? Math.max(0, upper - Math.max(0, lower)) : null

  chartData.push({
    month: forecastMonth,
    monthLabel: forecastMonthLabel,
    expenses: null,
    income: null,
    margin: null,
    expensesForecast: forecast.predictedExpenses,
    incomeForecast: forecast.predictedIncome,
    rangeBase,
    rangeSpan,
    isForecast: true,
  })

  return { chartData, forecastMonthLabel, lastFactLabel }
}

export function ForecastChart({ history, forecast }: ForecastChartProps) {
  const hasFact = history.some((row) => row.totalExpenses > 0 || row.totalIncome > 0)
  const lowHistory = history.filter((r) => r.totalExpenses > 0 || r.totalIncome > 0).length < 4
  const { chartData, lastFactLabel } = buildChartData(history, forecast)
  const showForecast =
    !forecast.insufficientData && forecast.predictedExpenses != null && hasFact

  if (!hasFact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Что было и что ожидается</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Нет расходов и отгрузок за выбранный период — график не строится. Добавьте записи в
            разделах «Расходы» и «Отгрузки».
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Что было и что ожидается</CardTitle>
        <p className="text-xs text-muted-foreground">
          Факт — из расходов и отгрузок. Прогноз — ориентир на следующий период.
          {lowHistory ? ' Истории пока мало — линии ориентировочные.' : null}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {showForecast && lastFactLabel ? (
                <ReferenceLine
                  x={lastFactLabel}
                  stroke={FORECAST_CHART_COLORS.divider}
                  strokeDasharray="3 3"
                  label={{
                    value: 'Факт → прогноз',
                    position: 'insideTopLeft',
                    fontSize: 10,
                    fill: FORECAST_CHART_COLORS.divider,
                  }}
                />
              ) : null}

              {/* Uncertainty band: stacked transparent base + muted span */}
              <Area
                type="monotone"
                dataKey="rangeBase"
                stackId="expenseRange"
                stroke="none"
                fill="transparent"
                legendType="none"
                connectNulls={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="rangeSpan"
                stackId="expenseRange"
                stroke="none"
                fill={FORECAST_CHART_COLORS.expensesRange}
                fillOpacity={0.22}
                name="Диапазон прогноза затрат"
                connectNulls={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="income"
                name="Доходы — факт"
                stroke={FORECAST_CHART_COLORS.incomeFact}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="incomeForecast"
                name="Доходы — прогноз"
                stroke={FORECAST_CHART_COLORS.incomeForecast}
                strokeDasharray="6 4"
                strokeWidth={2}
                strokeOpacity={0.95}
                dot={{ r: 4, fill: FORECAST_CHART_COLORS.incomeForecast }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Затраты — факт"
                stroke={FORECAST_CHART_COLORS.expensesFact}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="expensesForecast"
                name="Затраты — прогноз"
                stroke={FORECAST_CHART_COLORS.expensesForecast}
                strokeDasharray="6 4"
                strokeWidth={2}
                strokeOpacity={0.95}
                dot={{ r: 4, fill: FORECAST_CHART_COLORS.expensesForecast }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <li>
            <span className="font-medium text-foreground">Доходы:</span> отгрузки (кг × цена)
          </li>
          <li>
            <span className="font-medium text-foreground">Затраты:</span> модуль «Расходы»
          </li>
          <li>
            <span className="font-medium text-foreground">Факт:</span> сплошная линия
          </li>
          <li>
            <span className="font-medium text-foreground">Прогноз:</span> пунктир + серый диапазон
            неопределённости затрат
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}
