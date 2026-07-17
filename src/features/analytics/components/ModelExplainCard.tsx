import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatBacktestDeviation,
  extractMapeFromBacktest,
  getForecastMethodHumanLabel,
  getSimpleMethodExplanation,
  humanizeSelectionReason,
} from '../lib/forecastUi'
import type { ForecastBlock } from '../types'

type ModelExplainCardProps = {
  forecast: ForecastBlock
}

export function ModelExplainCard({ forecast }: ModelExplainCardProps) {
  const simple = getSimpleMethodExplanation(forecast)
  const mapeHint = formatBacktestDeviation(extractMapeFromBacktest(forecast.backtestMetrics))
  const differentModels =
    forecast.modelUsedExpenses &&
    forecast.modelUsedIncome &&
    forecast.modelUsedExpenses !== forecast.modelUsedIncome

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Как рассчитан прогноз</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="simple">
          <TabsList className="mb-3 grid w-full grid-cols-2">
            <TabsTrigger value="simple">Понятно</TabsTrigger>
            <TabsTrigger value="technical">Технически</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-2 text-sm">
            <p>{simple.expenses}</p>
            <p>{simple.income}</p>
            <p>{simple.margin}</p>
            <p className="text-muted-foreground">{simple.history}</p>
            {differentModels ? (
              <p className="text-muted-foreground">
                Для затрат и доходов система может использовать разные способы расчёта — они ведут
                себя по-разному.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {humanizeSelectionReason(forecast.selectionReasonExpenses)}
            </p>
          </TabsContent>

          <TabsContent value="technical" className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Метод (затраты): </span>
              {getForecastMethodHumanLabel(forecast.modelUsedExpenses)}
              {forecast.modelUsedExpenses ? ` (${forecast.modelUsedExpenses})` : ''}
            </p>
            <p>
              <span className="text-muted-foreground">Метод (доходы): </span>
              {getForecastMethodHumanLabel(forecast.modelUsedIncome)}
              {forecast.modelUsedIncome ? ` (${forecast.modelUsedIncome})` : ''}
            </p>
            <p className="text-muted-foreground">
              {forecast.selectionReasonExpenses || '—'}
            </p>
            <p className="text-muted-foreground">
              {forecast.selectionReasonIncome || '—'}
            </p>
            {mapeHint ? <p className="text-muted-foreground">{mapeHint}</p> : null}
            <p>
              <span className="text-muted-foreground">Месяцев истории: </span>
              {forecast.monthsUsed}
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
