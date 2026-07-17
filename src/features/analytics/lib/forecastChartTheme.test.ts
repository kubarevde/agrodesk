import { describe, expect, it } from 'vitest'
import { FORECAST_CHART_COLORS, FORECAST_CHART_SERIES } from './forecastChartTheme'

describe('forecastChartTheme', () => {
  it('keeps income and expenses in distinct color clusters', () => {
    expect(FORECAST_CHART_COLORS.incomeFact).not.toBe(FORECAST_CHART_COLORS.expensesFact)
    expect(FORECAST_CHART_COLORS.incomeForecast).not.toBe(FORECAST_CHART_COLORS.expensesForecast)
    expect(FORECAST_CHART_COLORS.expensesForecast).not.toBe(FORECAST_CHART_COLORS.expensesFact)
  })

  it('defines legend series in readable order', () => {
    const names = FORECAST_CHART_SERIES.map((s) => s.name)
    expect(names[0]).toContain('Доходы — факт')
    expect(names).toContain('Диапазон прогноза затрат')
  })
})
