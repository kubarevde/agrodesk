import { describe, expect, it } from 'vitest'
import {
  getForecastMethodHumanLabel,
  getForecastPeriodPhrase,
  getForecastReliabilityLabel,
  getKpiCardTitle,
  humanizeConfidenceNote,
  humanizeRecommendationTitle,
  humanizeSelectionReason,
  humanizeWhyNumbers,
  listMonthKeysInclusive,
  resolveFactForecastChartRange,
} from './forecastUi'

describe('forecastUi', () => {
  it('humanizes model names', () => {
    expect(getForecastMethodHumanLabel('moving_average')).toBe('Среднее по прошлым месяцам')
  })

  it('builds period-aware kpi titles', () => {
    expect(getKpiCardTitle('expenses', 1)).toContain('следующем месяце')
    expect(getKpiCardTitle('income', 3)).toContain('следующем квартале')
    expect(getForecastPeriodPhrase(1)).toBe('в следующем месяце')
  })

  it('maps reliability labels', () => {
    expect(getForecastReliabilityLabel('basic')).toBe('базовая')
    expect(getForecastReliabilityLabel('good')).toBe('хорошая')
  })

  it('strips technical jargon from confidence note', () => {
    const raw = 'Использовано 18 мес., модель moving_average, достоверность: относительно надёжный.'
    expect(humanizeConfidenceNote(raw, 18)).not.toContain('moving_average')
    expect(humanizeConfidenceNote(raw, 18)).toContain('18')
  })

  it('humanizes selection reason with MAE/MAPE', () => {
    const raw =
      'Выбран moving_average: MAE=80720.00, MAPE=100.0%. При близком качестве предпочитаем более простую модель.'
    const out = humanizeSelectionReason(raw)
    expect(out).not.toContain('MAE')
    expect(out).not.toContain('moving_average')
  })

  it('humanizes category in recommendation title', () => {
    expect(humanizeRecommendationTitle('Категория «fuel» растёт быстрее остальных')).toContain('Топливо')
  })

  it('derives recommendation context from why numbers', () => {
    const derived = humanizeWhyNumbers({ growth_pct: 120, last_month: 41000 }, 'warning')
    expect(derived.context).toContain('2 раза')
  })

  it('resolves one calendar year from org creation', () => {
    const range = resolveFactForecastChartRange('2026-03-15T10:00:00Z', new Date('2026-06-01'))
    expect(range.startMonth).toBe('2026-03')
    expect(range.endMonth).toBe('2027-02')
    expect(listMonthKeysInclusive(range.startMonth, range.endMonth)).toHaveLength(12)
  })

  it('rolls to last 12 months after the first org year', () => {
    const range = resolveFactForecastChartRange('2024-01-10T00:00:00Z', new Date('2026-07-15'))
    expect(range.startMonth).toBe('2025-08')
    expect(range.endMonth).toBe('2026-07')
  })
})
