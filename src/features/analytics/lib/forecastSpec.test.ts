import { describe, expect, it } from 'vitest'
import { buildCategoryInsights } from './forecastSpec'
import type { CategoryForecast, ForecastHistoryRow } from '../types'

const history: ForecastHistoryRow[] = [
  {
    month: '2026-06',
    totalExpenses: 100000,
    totalIncome: 150000,
    totalMargin: 50000,
    totalShiftCost: 0,
    totalMaintenanceCost: 0,
    criticalInventoryCount: 0,
    plannedWorkload: 0,
    byCategory: { fuel: 40000, parts: 20000, other: 40000 },
  },
]

describe('buildCategoryInsights', () => {
  it('marks growing categories from real expense forecast vs last month', () => {
    const rows: CategoryForecast[] = [
      {
        category: 'fuel',
        predictedValue: 60000,
        modelName: 'moving_average',
        lastMonthValue: 40000,
        growthPct: 50,
        monthsWithData: 6,
      },
      {
        category: 'parts',
        predictedValue: 18000,
        modelName: 'moving_average',
        lastMonthValue: 20000,
        growthPct: -10,
        monthsWithData: 6,
      },
    ]
    const insights = buildCategoryInsights(rows, history, (code) =>
      code === 'fuel' ? 'Топливо' : 'Запчасти',
    )
    expect(insights.find((r) => r.category === 'fuel')?.mayGrow).toBe(true)
    expect(insights.find((r) => r.category === 'parts')?.mayGrow).toBe(false)
    expect(insights[0]?.reason).toContain('Расходы')
  })

  it('skips empty categories', () => {
    const rows: CategoryForecast[] = [
      {
        category: 'rent',
        predictedValue: 0,
        modelName: null,
        lastMonthValue: 0,
        growthPct: null,
        monthsWithData: 0,
      },
    ]
    expect(buildCategoryInsights(rows, history, (c) => c)).toHaveLength(0)
  })

  it('flags low confidence when few months with data', () => {
    const rows: CategoryForecast[] = [
      {
        category: 'fuel',
        predictedValue: 50000,
        modelName: 'moving_average',
        lastMonthValue: 40000,
        growthPct: 25,
        monthsWithData: 1,
      },
    ]
    const [row] = buildCategoryInsights(rows, history, () => 'Топливо')
    expect(row?.lowConfidence).toBe(true)
    expect(row?.reason).toContain('ориентировочная')
  })
})
