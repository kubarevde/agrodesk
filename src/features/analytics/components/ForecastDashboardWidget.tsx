import { Link } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/format'
import { useForecast, useRecommendations } from '../hooks'
import {
  getForecastPeriodLabel,
  getInsufficientDataMessage,
  lastHistoryMonth,
} from '../lib/forecastUi'

export function ForecastDashboardWidget() {
  const { data: forecastData, isLoading: forecastLoading } = useForecast('auto', 1)
  const { data: recommendations = [], isLoading: recLoading } = useRecommendations()

  if (forecastLoading || recLoading) {
    return <Skeleton className="h-36 w-full rounded-xl" />
  }

  const forecast = forecastData?.forecast
  const periodLabel = getForecastPeriodLabel(
    lastHistoryMonth(forecastData?.history ?? []),
    1,
  )
  const warnings = recommendations.filter((r) => r.level === 'warning' || r.level === 'critical')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" />
          Прогноз на {periodLabel}
        </CardTitle>
        <Link to="/analytics/forecast" className="text-sm text-primary hover:underline">
          Подробнее
        </Link>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {forecast?.insufficientData ? (
          <p className="text-muted-foreground">{getInsufficientDataMessage(forecast)}</p>
        ) : (
          <>
            <p>
              Ожидаемые затраты:{' '}
              <span className="font-medium">
                {forecast?.predictedExpenses == null
                  ? '—'
                  : formatMoney(forecast.predictedExpenses, { decimals: 0 })}
              </span>
            </p>
            <p>
              Ожидаемый доход:{' '}
              <span className="font-medium">
                {forecast?.predictedIncome == null
                  ? '—'
                  : formatMoney(forecast.predictedIncome, { decimals: 0 })}
              </span>
            </p>
            <p>
              Ожидаемая прибыль:{' '}
              <span className="font-medium">
                {forecast?.predictedMargin == null
                  ? '—'
                  : formatMoney(forecast.predictedMargin, { decimals: 0 })}
              </span>
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{warnings.length} рекоменд.</Badge>
          {warnings.some((r) => r.level === 'critical') ? (
            <Badge variant="destructive">Есть срочные риски</Badge>
          ) : warnings.length > 0 ? (
            <Badge variant="secondary">Есть предупреждения</Badge>
          ) : (
            <Badge variant="outline">Рисков мало</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
