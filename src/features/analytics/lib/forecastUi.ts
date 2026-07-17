import { addMonths, format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LEGACY_EXPENSE_CATEGORY_LABELS } from '@/features/dictionaries/labels'
import type { ForecastBlock, ForecastHistoryRow } from '../types'

export type ForecastReliability = 'basic' | 'medium' | 'good'

const METHOD_LABELS: Record<string, string> = {
  auto: 'Автовыбор',
  moving_average: 'Среднее по прошлым месяцам',
  linear_trend: 'Линейный тренд',
  ets: 'Сезонная модель (ETS)',
  sarimax: 'SARIMAX',
  prophet: 'Prophet',
}

export function getForecastMethodHumanLabel(model: string | null | undefined): string {
  if (!model?.trim()) return '—'
  const key = model.trim().toLowerCase()
  return METHOD_LABELS[key] ?? model.replace(/_/g, ' ')
}

export function getForecastReliability(monthsUsed: number): ForecastReliability {
  if (monthsUsed < 6) return 'basic'
  if (monthsUsed < 12) return 'medium'
  return 'good'
}

export function getForecastReliabilityLabel(reliability: ForecastReliability): string {
  const map: Record<ForecastReliability, string> = {
    basic: 'базовая',
    medium: 'средняя',
    good: 'хорошая',
  }
  return map[reliability]
}

export function getForecastPeriodPhrase(monthsAhead: number): string {
  if (monthsAhead === 1) return 'в следующем месяце'
  if (monthsAhead === 3) return 'в следующем квартале'
  return `на ${monthsAhead} мес. вперёд`
}

export function getForecastPeriodLabel(
  lastHistoryMonth: string | undefined,
  monthsAhead: number,
): string {
  if (!lastHistoryMonth) return 'Следующий период'
  const parsed = parseISO(`${lastHistoryMonth}-01`)
  const start = addMonths(parsed, 1)
  if (monthsAhead === 1) {
    return format(start, 'LLLL yyyy', { locale: ru })
  }
  if (monthsAhead === 3) {
    const end = addMonths(start, 2)
    return `${format(start, 'LLL yyyy', { locale: ru })} — ${format(end, 'LLL yyyy', { locale: ru })}`
  }
  const end = addMonths(start, monthsAhead - 1)
  return `${format(start, 'LLL yyyy', { locale: ru })} — ${format(end, 'LLL yyyy', { locale: ru })}`
}

export function getKpiCardTitle(
  metric: 'expenses' | 'income' | 'margin',
  monthsAhead: number,
): string {
  const titles = {
    expenses: 'Ожидаемые затраты',
    income: 'Ожидаемый доход',
    margin: 'Ожидаемая прибыль',
  }
  return `${titles[metric]} ${getForecastPeriodPhrase(monthsAhead)}`
}

export function getHistorySummary(monthsUsed: number): string {
  if (monthsUsed <= 0) return 'Недостаточно истории для расчёта'
  const word =
    monthsUsed % 10 === 1 && monthsUsed % 100 !== 11
      ? 'месяц'
      : monthsUsed % 10 >= 2 && monthsUsed % 10 <= 4 && (monthsUsed % 100 < 10 || monthsUsed % 100 >= 20)
        ? 'месяца'
        : 'месяцев'
  return `Расчёт по данным за последние ${monthsUsed} ${word}`
}

export function humanizeConfidenceNote(note: string, monthsUsed: number): string {
  if (!note.trim()) return getHistorySummary(monthsUsed)
  if (/модель|MAE|MAPE|moving_average|sarimax|prophet|ets/i.test(note)) {
    return getHistorySummary(monthsUsed)
  }
  return note
}

export function humanizeSelectionReason(reason: string | null | undefined): string {
  if (!reason?.trim()) return 'Система подобрала способ расчёта по вашей истории.'
  if (/MAE|MAPE|holdout|fallback|moving_average|sarimax|prophet|ets|linear_trend/i.test(reason)) {
    if (/fallback/i.test(reason)) {
      return 'Основной способ не сработал, поэтому использован запасной расчёт по средним значениям.'
    }
    if (/задан вручную/i.test(reason)) {
      return 'Способ расчёта выбран вручную в расширенных настройках.'
    }
    if (/предпочитаем более простую/i.test(reason)) {
      return 'Система выбрала самый простой и устойчивый способ — он даёт сопоставимую точность на ваших данных.'
    }
    return 'Система сравнила несколько способов на прошлых месяцах и выбрала наиболее подходящий.'
  }
  return reason
}

export function getSimpleMethodExplanation(
  forecast: ForecastBlock,
): { expenses: string; income: string; margin: string; history: string } {
  const history = getHistorySummary(forecast.monthsUsed)
  const lowData = forecast.monthsUsed < 6

  return {
    expenses: lowData
      ? 'По затратам данных пока немного — прогноз ориентировочный.'
      : 'Для затрат выбран самый устойчивый способ расчёта по вашей истории расходов.',
    income: lowData
      ? 'По доходам учтены доступные месяцы отгрузок — точность будет расти с накоплением данных.'
      : 'Для доходов учтены прошлые отгрузки и сезонность.',
    margin: 'Ожидаемая прибыль — это разница между прогнозом дохода и затрат за выбранный период.',
    history,
  }
}

export type ForecastTrend = 'up' | 'down' | 'stable'

export function getForecastTrend(
  predicted: number | null,
  previous: number | null,
  thresholdPct = 0.03,
): ForecastTrend | null {
  if (predicted == null || previous == null || previous === 0) return null
  const change = (predicted - previous) / Math.abs(previous)
  if (Math.abs(change) < thresholdPct) return 'stable'
  return change > 0 ? 'up' : 'down'
}

export function getTrendBadgeLabel(
  metric: 'expenses' | 'income' | 'margin',
  trend: ForecastTrend | null,
): string | null {
  if (!trend || trend === 'stable') {
    if (metric === 'margin') return trend === 'stable' ? 'Стабильно' : null
    return trend === 'stable' ? 'Без изменений' : null
  }
  if (metric === 'expenses') return trend === 'up' ? 'Расход растёт' : 'Расход снижается'
  if (metric === 'income') return trend === 'up' ? 'Доход растёт' : 'Доход снижается'
  return trend === 'up' ? 'Прибыль улучшается' : 'Прибыль под давлением'
}

export function getTrendBadgeClass(trend: ForecastTrend | null, metric: 'expenses' | 'income' | 'margin'): string {
  if (!trend || trend === 'stable') return 'border-border bg-muted/40 text-muted-foreground'
  const good =
    (metric === 'expenses' && trend === 'down') ||
    (metric === 'income' && trend === 'up') ||
    (metric === 'margin' && trend === 'up')
  const bad =
    (metric === 'expenses' && trend === 'up') ||
    (metric === 'income' && trend === 'down') ||
    (metric === 'margin' && trend === 'down')
  if (good) return 'border-success/40 bg-success/10 text-success'
  if (bad) return 'border-destructive/40 bg-destructive/10 text-destructive'
  return 'border-border bg-muted/40 text-muted-foreground'
}

export function formatMonthLabel(monthKey: string): string {
  try {
    return format(parseISO(`${monthKey}-01`), 'LLL yyyy', { locale: ru })
  } catch {
    return monthKey
  }
}

export function humanizeRecommendationTitle(title: string): string {
  return title.replace(/«([a-z_]+)»/gi, (_, cat: string) => {
    const label = LEGACY_EXPENSE_CATEGORY_LABELS[cat.toLowerCase()]
    return label ? `«${label}»` : `«${cat}»`
  })
}

export function humanizeWhyNumbers(
  whyNumbers: Record<string, unknown>,
  level: string,
): { context: string | null; importance: string | null } {
  const growth = whyNumbers.growth_pct
  const lastMonth = whyNumbers.last_month
  const criticalCount = whyNumbers.critical_inventory_count
  const plannedWorkload = whyNumbers.planned_workload
  const margins = whyNumbers.margins

  if (typeof growth === 'number' && typeof lastMonth === 'number') {
    const times =
      growth >= 100 ? 'примерно в 2 раза' : growth >= 50 ? 'заметно' : `примерно на ${Math.round(growth)}%`
    return {
      context: `За последний месяц показатель вырос ${times}.`,
      importance:
        level === 'critical'
          ? 'Если рост сохранится, общие расходы в следующем периоде могут заметно вырасти.'
          : 'Стоит заранее проверить причины роста, пока он не стал системным.',
    }
  }

  if (typeof criticalCount === 'number' && criticalCount > 0) {
    const workload = Number(plannedWorkload ?? 0)
    return {
      context: `Сейчас ${criticalCount} позиц${criticalCount === 1 ? 'ия' : criticalCount < 5 ? 'ии' : 'ий'} ниже минимального запаса.`,
      importance:
        workload > 0
          ? 'На фоне запланированных работ это может привести к срочным и дорогим закупкам.'
          : 'Это повышает риск незапланированных расходов в разгар сезона.',
    }
  }

  if (Array.isArray(margins) && margins.length >= 2) {
    return {
      context: 'Прибыль снижается несколько месяцев подряд.',
      importance: 'Без корректировки цен или затрат ситуация может ухудшиться в следующем периоде.',
    }
  }

  if (typeof whyNumbers.current_share_pct === 'number') {
    return {
      context: `Доля категории в расходах выросла до ${whyNumbers.current_share_pct}%.`,
      importance: 'Такие скачки часто сигнализируют о перерасходе или изменении закупок.',
    }
  }

  return { context: null, importance: null }
}

export function getRecommendationActionLink(
  relatedEntityType: string | null,
  relatedEntityId: string | null,
): { label: string; to: string } | null {
  if (!relatedEntityType) return null
  const type = relatedEntityType.toLowerCase()
  if (type === 'inventory_item') return { label: 'Открыть склад', to: '/inventory' }
  if (type === 'equipment' && relatedEntityId) {
    return { label: 'Открыть технику', to: `/equipment/${relatedEntityId}` }
  }
  if (type === 'equipment' || type === 'equipment_maintenance') {
    return { label: 'Открыть технику', to: '/equipment' }
  }
  if (type === 'expense_category' || type === 'finance') {
    return { label: 'Открыть расходы', to: '/expenses' }
  }
  return null
}

export function getInsufficientDataMessage(forecast: ForecastBlock): string {
  return (
    forecast.disclaimer ||
    'Данных пока недостаточно для уверенного прогноза. Продолжайте вносить расходы и отгрузки — точность вырастет.'
  )
}

export function extractMapeFromBacktest(backtestMetrics: Record<string, unknown>): number | null {
  const groups = ['expenses', 'income', 'margin_direct']
  let best: number | null = null
  for (const key of groups) {
    const list = backtestMetrics[key]
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (!item || typeof item !== 'object' || !('mape' in item)) continue
      const mape = Number((item as Record<string, unknown>).mape)
      if (Number.isNaN(mape) || mape <= 0) continue
      best = best == null ? mape : Math.min(best, mape)
    }
  }
  return best
}

export function formatBacktestDeviation(mape: number | null): string | null {
  if (mape == null || Number.isNaN(mape)) return null
  return `Отклонение на прошлых данных: около ${Math.round(mape)}%. Чем меньше — тем точнее прогноз.`
}

export function lastHistoryMonth(history: ForecastHistoryRow[]): string | undefined {
  return history[history.length - 1]?.month
}
