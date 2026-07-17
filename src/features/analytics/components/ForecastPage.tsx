import { useState } from 'react'
import { ChevronDown, Settings2, TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import { cn } from '@/lib/utils'
import { useForecast, useRecommendations } from '../hooks'
import { getForecastPeriodLabel, lastHistoryMonth } from '../lib/forecastUi'
import { CategoryForecastChart } from './CategoryForecastChart'
import { ForecastChart } from './ForecastChart'
import { ForecastHowItWorks } from './ForecastHowItWorks'
import { ForecastKpiCards } from './ForecastKpiCards'
import { ForecastTechnicalDetails } from './ForecastTechnicalDetails'
import { ModelExplainCard } from './ModelExplainCard'
import { RecommendationsList } from './RecommendationsList'

const HORIZON_OPTIONS = selectOptions([
  { value: '1', label: 'Следующий месяц' },
  { value: '3', label: 'Следующий квартал' },
])

const METHOD_OPTIONS = selectOptions([
  { value: 'auto', label: 'Автовыбор' },
  { value: 'moving_average', label: 'Среднее по месяцам' },
  { value: 'linear_trend', label: 'Линейный тренд' },
  { value: 'ets', label: 'ETS (сезонность)' },
  { value: 'sarimax', label: 'SARIMAX' },
  { value: 'prophet', label: 'Prophet' },
])

export function ForecastPage() {
  const [method, setMethod] = useState('auto')
  const [monthsAhead, setMonthsAhead] = useState(1)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const { data, isLoading, isError } = useForecast(method, monthsAhead)
  const { data: recommendations = [], isLoading: recLoading } = useRecommendations()

  if (isLoading || recLoading) return <PageSkeleton />
  if (isError || !data) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Не удалось загрузить прогноз"
        description="Проверьте сеть и права доступа менеджера."
      />
    )
  }

  const periodLabel = getForecastPeriodLabel(lastHistoryMonth(data.history), monthsAhead)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Прогноз и оптимизация</h1>
          <p className="text-sm text-muted-foreground">
            Ориентир по затратам, доходам и рискам на период: {periodLabel}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:w-56">
          <LabeledSelect
            value={String(monthsAhead)}
            options={HORIZON_OPTIONS}
            placeholder="Период"
            onValueChange={(value) => setMonthsAhead(Number(value || 1))}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-between"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <Settings2 className="size-4" />
              Расширенные настройки
            </span>
            <ChevronDown className={cn('size-4 transition-transform', advancedOpen && 'rotate-180')} />
          </Button>
          {advancedOpen ? (
            <LabeledSelect
              value={method}
              options={METHOD_OPTIONS}
              placeholder="Метод расчёта"
              onValueChange={(value) => setMethod(value || 'auto')}
            />
          ) : null}
        </div>
      </div>

      <ForecastKpiCards forecast={data.forecast} history={data.history} monthsAhead={monthsAhead} />
      <ForecastHowItWorks />
      <ForecastChart history={data.history} forecast={data.forecast} />
      <CategoryForecastChart
        rows={data.byCategory}
        history={data.history}
        periodLabel={periodLabel}
      />
      <div>
        <h2 className="mb-3 text-lg font-medium text-foreground">Рекомендации</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Что стоит проверить прямо сейчас, чтобы снизить риски и неожиданные расходы.
        </p>
        <RecommendationsList items={recommendations} />
      </div>
      <ModelExplainCard forecast={data.forecast} />
      <ForecastTechnicalDetails forecast={data.forecast} modelCandidates={data.modelCandidates} />
    </div>
  )
}
