import { TrendingDown, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDictionary } from '@/features/dictionaries/hooks'
import { getCategoryColor, getCategoryLabel } from '@/features/expenses/utils'
import { buildCategoryInsights } from '../lib/forecastSpec'
import type { CategoryForecast, ForecastHistoryRow } from '../types'

type CategoryForecastChartProps = {
  rows: CategoryForecast[]
  history: ForecastHistoryRow[]
  periodLabel?: string
}

function money(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽'
}

export function CategoryForecastChart({
  rows,
  history,
  periodLabel,
}: CategoryForecastChartProps) {
  const { data: dictionary = [] } = useDictionary('expense_category', { activeOnly: false })
  const insights = buildCategoryInsights(rows, history, (code) =>
    getCategoryLabel(code, dictionary),
  )
  const growing = insights.filter((row) => row.mayGrow)
  const chartData = insights.map((row) => ({
    name: row.label,
    category: row.category,
    value: row.predicted,
    mayGrow: row.mayGrow,
  }))

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Прогноз по категориям расходов</CardTitle>
        <p className="text-xs text-muted-foreground">
          Источник: модуль «Расходы» (Expense.category из справочника категорий затрат)
          {periodLabel ? ` · период прогноза: ${periodLabel}` : null}.
          Зарплата из смен и списания склада сюда не входят — только оформленные расходы.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Недостаточно данных по категориям расходов. Добавьте расходы с категориями в разделе
            «Расходы».
          </p>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} width={56} />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === 'number' ? money(value) : String(value ?? '—')
                    }
                    labelFormatter={(label) => `Категория: ${label}`}
                  />
                  <Bar dataKey="value" name="Ожидаемые затраты" radius={4}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={getCategoryColor(entry.category)}
                        fillOpacity={entry.mayGrow ? 1 : 0.55}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Какие расходы могут вырасти
                {growing.length === 0 ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    — сейчас рост не ожидается
                  </span>
                ) : null}
              </h3>
              {growing.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  По сравнению с последним месяцем ни одна категория не показывает заметный рост
                  прогноза (&gt;5%).
                </p>
              ) : (
                <ul className="space-y-2">
                  {growing.map((row) => (
                    <li
                      key={row.category}
                      className="rounded-lg border border-border bg-card px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{row.label}</span>
                        <Badge variant="outline" className="border-destructive/40 text-destructive">
                          <TrendingUp className="mr-1 size-3" />
                          +{Math.round(row.growthPct ?? 0)}%
                        </Badge>
                        {row.lowConfidence ? (
                          <Badge variant="secondary">Низкая уверенность</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
                      <p className="mt-1 text-xs text-foreground">
                        Было {money(row.lastMonth)} → ожидание {money(row.predicted)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {insights.some((row) => !row.mayGrow && row.growthPct != null && row.growthPct < -5) ? (
                <div className="pt-1">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Могут снизиться</p>
                  <ul className="space-y-1">
                    {insights
                      .filter((row) => row.growthPct != null && row.growthPct < -5)
                      .map((row) => (
                        <li
                          key={row.category}
                          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                        >
                          <TrendingDown className="size-3 text-success" />
                          <span>{row.label}</span>
                          <span>
                            {money(row.lastMonth)} → {money(row.predicted)} (
                            {Math.round(row.growthPct ?? 0)}%)
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
