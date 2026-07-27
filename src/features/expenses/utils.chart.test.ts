import { describe, expect, it } from 'vitest'
import {
  OTHER_CATEGORY_KEY,
  aggregateCategoryChartData,
  getCategoryColor,
} from './utils'

describe('aggregateCategoryChartData', () => {
  it('returns all categories when count is within topN', () => {
    const points = [
      { category: 'fuel', amount: 100, percent: 50 },
      { category: 'parts', amount: 100, percent: 50 },
    ]
    const result = aggregateCategoryChartData(points, 6)
    expect(result.segments).toHaveLength(2)
    expect(result.otherDetails).toHaveLength(0)
    expect(result.segments.every((s) => !s.isOther)).toBe(true)
  })

  it('folds overflow into Прочее keeping top N-1 explicit', () => {
    const points = Array.from({ length: 8 }, (_, i) => ({
      category: `cat-${i}`,
      amount: 800 - i * 100,
      percent: 0,
    }))
    const result = aggregateCategoryChartData(points, 6)
    expect(result.segments).toHaveLength(6)
    expect(result.segments.filter((s) => !s.isOther)).toHaveLength(5)
    const other = result.segments.find((s) => s.isOther)
    expect(other?.category).toBe(OTHER_CATEGORY_KEY)
    // head: 800..400 (5), rest: 300+200+100
    expect(other?.amount).toBe(600)
    expect(result.otherDetails.map((d) => d.category)).toEqual([
      'cat-5',
      'cat-6',
      'cat-7',
    ])
  })

  it('sorts by amount descending before aggregation', () => {
    const points = [
      { category: 'small', amount: 10, percent: 10 },
      { category: 'big', amount: 90, percent: 90 },
    ]
    const result = aggregateCategoryChartData(points, 6)
    expect(result.segments[0].category).toBe('big')
  })
})

describe('getCategoryColor', () => {
  it('uses muted gray for Прочее aggregate', () => {
    expect(getCategoryColor(OTHER_CATEGORY_KEY)).toContain('7A7974')
  })

  it('uses non-neutral hues for known categories', () => {
    expect(getCategoryColor('fuel')).toBe('#01696F')
    expect(getCategoryColor('salary')).not.toBe('#7A7974')
  })
})
