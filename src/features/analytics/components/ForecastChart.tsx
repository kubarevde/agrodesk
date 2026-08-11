import { useMemo } from 'react'
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
import {
  formatMonthLabel,
  resolveFactForecastChartRange,
  windowForecastHistory,
} from '../lib/forecastUi'
import type { ForecastBlock, ForecastHistoryRow } from '../types'

type ForecastChartProps = {
  history: ForecastHistoryRow[]
  forecast: ForecastBlock
  orgCreatedAt?: string | null
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
    <div className="max-w-[min(100vw-2rem,16rem)] rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {row.isForecast ? 'Прогноз' : 'Факт'}
      </p>
      {row.isForecast ? (
        <>
          <p className="text-destructive">Затраты (ожидаемо): {money(row.expensesForecast)}</p>
          <p className="text-success">Доходы (ожидаемо): {money(row.incomeForecast)}</p>
          {row.rangeBase != null && row.rangeSpan != null ? (
            <p className="text-muted-foreground">
              Диапазон затрат: {money(row.rangeBase)} — {money(row.rangeBase + row.rangeSpan)}
            </p>
          ) : null}
          <p className="text-foreground">
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
          <p className="text-destructive">Затраты: {money(row.expenses)}</p>
          <p className="text-success">Доходы: {money(row.income)}</p>
          <p className="text-foreground">Прибыль: {money(row.margin)}</p>
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

  const lastFactWithData = [...history]
    .reverse()
    .find((row) => row.totalExpenses > 0 || row.totalIncome > 0)
  const lastFactIndex = lastFactWithData
    ? chartData.findIndex((row) => row.month === lastFactWithData.month)
    : chartData.length - 1
  const lastFactLabel =
    lastFactIndex >= 0 ? (chartData[lastFactIndex]?.monthLabel ?? null) : null
  let forecastMonthLabel: string | null = null

  if (
    forecast.insufficientData ||
    forecast.predictedExpenses == null ||
    !lastFactWithData
  ) {
    return { chartData, forecastMonthLabel, lastFactLabel }
  }

  const [y, m] = lastFactWithData.month.split('-').map(Number)
  const d = new Date(y, m, 1)
  const forecastMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  forecastMonthLabel = formatMonthLabel(forecastMonth)

  const lastRow = lastFactIndex >= 0 ? chartData[lastFactIndex] : null
  if (lastRow) {
    lastRow.expensesForecast = lastRow.expenses
    lastRow.incomeForecast = lastRow.income
  }

  const lower = forecast.intervals.expensesLower
  const upper = forecast.intervals.expensesUpper
  const rangeBase = lower != null ? Math.max(0, lower) : null
  const rangeSpan =
    lower != null && upper != null ? Math.max(0, upper - Math.max(0, lower)) : null

  const existingForecastIdx = chartData.findIndex((row) => row.month === forecastMonth)
  const forecastRow: ChartRow = {
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
  }

  if (existingForecastIdx >= 0) {
    chartData[existingForecastIdx] = {
      ...chartData[existingForecastIdx],
      ...forecastRow,
      expenses: null,
      income: null,
      margin: null,
    }
  } else {
    chartData.push(forecastRow)
  }

  return { chartData, forecastMonthLabel, lastFactLabel }
}

export function ForecastChart({ history, forecast, orgCreatedAt = null }: ForecastChartProps) {
  const windowedHistory = useMemo(
    () => windowForecastHistory(history, orgCreatedAt),
    [history, orgCreatedAt],
  )
  const range = useMemo(
    () => resolveFactForecastChartRange(orgCreatedAt),
    [orgCreatedAt],
  )

  const hasFact = windowedHistory.some((row) => row.totalExpenses > 0 || row.totalIncome > 0)
  const lowHistory =
    windowedHistory.filter((r) => r.totalExpenses > 0 || r.totalIncome > 0).length < 4
  const { chartData, lastFactLabel } = buildChartData(windowedHistory, forecast)
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
            Нет расходов и отгрузок за выбранный период — график не строится. Добавьте записи во
            вкладках «Затраты» и «Доходы» или в разделе «Отгрузки».
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="space-y-1 px-4 sm:px-6">
        <CardTitle className="text-base">Что было и что ожидается</CardTitle>
        <p className="text-xs text-muted-foreground">
          Факт — из затрат, доходов и отгрузок. Прогноз — ориентир на следующий период. Окно
          графика: 12 месяцев с даты создания организации
          {range.startMonth !== range.endMonth
            ? ` (${formatMonthLabel(range.startMonth)} — ${formatMonthLabel(range.endMonth)})`
            : null}
          .
          {lowHistory ? ' Истории пока мало — линии ориентировочные.' : null}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 px-2 sm:px-6">
        <div className="h-56 w-full min-w-0 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 4, left: -8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={8}
                angle={-30}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={{ fontSize: 10 }} width={44} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                iconSize={10}
                verticalAlign="bottom"
              />
              {showForecast && lastFactLabel ? (
                <ReferenceLine
                  x={lastFactLabel}
                  stroke={FORECAST_CHART_COLORS.divider}
                  strokeDasharray="3 3"
                  label={{
                    value: 'Факт → прогноз',
                    position: 'insideTopLeft',
                    fontSize: 9,
                    fill: FORECAST_CHART_COLORS.divider,
                  }}
                />
              ) : null}

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
                dot={{ r: 3, fill: FORECAST_CHART_COLORS.incomeForecast }}
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
                dot={{ r: 3, fill: FORECAST_CHART_COLORS.expensesForecast }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <ul className="grid gap-1 px-2 text-xs text-muted-foreground sm:grid-cols-2 sm:px-0">
          <li>
            <span className="font-medium text-foreground">Доходы:</span> отгрузки и ручные доходы
          </li>
          <li>
            <span className="font-medium text-foreground">Затраты:</span> вкладка «Затраты»
          </li>
          <li>
            <span className="font-medium text-foreground">Факт:</span> сплошная линия
          </li>
          <li>
            <span className="font-medium text-foreground">Прогноз:</span> пунктир + диапазон
            неопределённости
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}
