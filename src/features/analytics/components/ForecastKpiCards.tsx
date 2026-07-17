import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/format'
import {
  getForecastPeriodLabel,
  getForecastReliability,
  getForecastReliabilityLabel,
  getForecastTrend,
  getHistorySummary,
  getInsufficientDataMessage,
  getKpiCardTitle,
  getTrendBadgeClass,
  getTrendBadgeLabel,
  lastHistoryMonth,
} from '../lib/forecastUi'
import type { ForecastBlock, ForecastHistoryRow } from '../types'

type ForecastKpiCardsProps = {
  forecast: ForecastBlock
  history: ForecastHistoryRow[]
  monthsAhead: number
}

export function ForecastKpiCards({ forecast, history, monthsAhead }: ForecastKpiCardsProps) {
  if (forecast.insufficientData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Прогноз пока недоступен</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {getInsufficientDataMessage(forecast)}
        </CardContent>
      </Card>
    )
  }

  const last = history[history.length - 1]
  const periodLabel = getForecastPeriodLabel(lastHistoryMonth(history), monthsAhead)
  const reliability = getForecastReliability(forecast.monthsUsed)

  const items = [
    {
      key: 'expenses' as const,
      title: getKpiCardTitle('expenses', monthsAhead),
      value: forecast.predictedExpenses,
      previous: last?.totalExpenses ?? null,
    },
    {
      key: 'income' as const,
      title: getKpiCardTitle('income', monthsAhead),
      value: forecast.predictedIncome,
      previous: last?.totalIncome ?? null,
    },
    {
      key: 'margin' as const,
      title: getKpiCardTitle('margin', monthsAhead),
      value: forecast.predictedMargin,
      previous: last?.totalMargin ?? null,
    },
  ]

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const trend = getForecastTrend(item.value, item.previous)
          const trendLabel = getTrendBadgeLabel(item.key, trend)
          return (
            <Card key={item.key}>
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
                <p className="text-xs text-muted-foreground">Период: {periodLabel}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-semibold text-foreground">
                  {item.value == null ? '—' : formatMoney(item.value, { decimals: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">{getHistorySummary(forecast.monthsUsed)}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    Надёжность: {getForecastReliabilityLabel(reliability)}
                  </Badge>
                  {trendLabel ? (
                    <Badge variant="outline" className={getTrendBadgeClass(trend, item.key)}>
                      {trendLabel}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Оценка на основе прошлых расходов и сезонности. Это ориентир для планирования, а не гарантия.
      </p>
    </div>
  )
}
