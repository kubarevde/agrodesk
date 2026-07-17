import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatBacktestDeviation,
  extractMapeFromBacktest,
  getForecastMethodHumanLabel,
  humanizeSelectionReason,
} from '../lib/forecastUi'
import type { ForecastBlock, ForecastResponse } from '../types'
import { cn } from '@/lib/utils'

type ForecastTechnicalDetailsProps = {
  forecast: ForecastBlock
  modelCandidates: ForecastResponse['modelCandidates']
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  )
}

export function ForecastTechnicalDetails({
  forecast,
  modelCandidates,
}: ForecastTechnicalDetailsProps) {
  const [open, setOpen] = useState(false)
  const mapeHint = formatBacktestDeviation(extractMapeFromBacktest(forecast.backtestMetrics))
  const candidates = modelCandidates.filter((c) => c.available).map((c) => c.label || c.id).join(', ')

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Технические детали</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
            {open ? 'Скрыть' : 'Показать'}
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-3 border-t border-border pt-3 text-sm">
          <MetricRow
            label="Метод расчёта (затраты)"
            value={getForecastMethodHumanLabel(forecast.modelUsedExpenses)}
          />
          <MetricRow
            label="Метод расчёта (доходы)"
            value={getForecastMethodHumanLabel(forecast.modelUsedIncome)}
          />
          <MetricRow
            label="Почему выбран (затраты)"
            value={forecast.selectionReasonExpenses || '—'}
          />
          <MetricRow
            label="Почему выбран (доходы)"
            value={forecast.selectionReasonIncome || '—'}
          />
          {mapeHint ? <p className="text-muted-foreground">{mapeHint}</p> : null}
          {candidates ? (
            <MetricRow label="Доступные методы" value={candidates} />
          ) : null}
          <p className="text-xs text-muted-foreground">
            {humanizeSelectionReason(forecast.selectionReasonExpenses)}
          </p>
        </CardContent>
      ) : null}
    </Card>
  )
}
