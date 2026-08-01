import { describe, expect, it } from 'vitest'
import {
  averageRating,
  flattenCategories,
  formatMarketPrice,
  formatMarketPriceAmount,
  isListingInStock,
  publicStockLabel,
  publicStockShort,
  sortListings,
} from './lib'
import type { PublicCategoryNode, PublicListingCard } from './types'

const sampleListings: PublicListingCard[] = [
  {
    id: '1',
    title: 'Мёд',
    description: null,
    price: 500,
    unit: 'кг',
    quantity_available: 2,
    photos: ['https://example.com/a.jpg'],
    category_id: null,
    published_at: '2026-07-01T10:00:00Z',
    seller: { id: 's1', display_name: 'Пасека', is_verified: true },
  },
  {
    id: '2',
    title: 'Масло',
    description: null,
    price: 200,
    unit: 'л',
    quantity_available: 5,
    photos: [],
    category_id: null,
    published_at: '2026-07-10T10:00:00Z',
    seller: { id: 's2', display_name: 'Ферма', is_verified: false },
  },
]

describe('marketplace-public lib', () => {
  it('formats price with unit', () => {
    expect(formatMarketPrice(350, 'кг')).toContain('350')
    expect(formatMarketPrice(350, 'кг')).toContain('кг')
    expect(formatMarketPriceAmount(350)).toContain('350')
    expect(formatMarketPriceAmount(350)).toContain('₽')
  })

  it('sorts by price and date', () => {
    expect(sortListings(sampleListings, 'price_asc').map((r) => r.id)).toEqual(['2', '1'])
    expect(sortListings(sampleListings, 'price_desc').map((r) => r.id)).toEqual(['1', '2'])
    expect(sortListings(sampleListings, 'date_desc').map((r) => r.id)).toEqual(['2', '1'])
  })

  it('flattens category tree for filters', () => {
    const tree: PublicCategoryNode[] = [
      {
        id: 'c1',
        name: 'Мёд',
        slug: 'honey',
        icon: null,
        sort_order: 0,
        children: [
          {
            id: 'c2',
            name: 'Гречишный',
            slug: 'buckwheat',
            icon: null,
            sort_order: 0,
            children: [],
          },
        ],
      },
    ]
    expect(flattenCategories(tree)).toEqual([
      { id: 'c1', name: 'Мёд', depth: 0 },
      { id: 'c2', name: 'Гречишный', depth: 1 },
    ])
  })

  it('averages ratings', () => {
    expect(averageRating([{ rating: 5 }, { rating: 4 }])).toBe(4.5)
    expect(averageRating([])).toBeNull()
  })

  it('formats buyer stock labels without internals', () => {
    expect(isListingInStock(0)).toBe(false)
    expect(isListingInStock('3')).toBe(true)
    expect(publicStockLabel(0, 'кг')).toBe('Сейчас нет в наличии')
    expect(publicStockLabel(12, 'л')).toBe('В наличии: 12 л')
    expect(publicStockShort(0, 'кг')).toBe('Нет в наличии')
    expect(publicStockShort(5, 'кг')).toBe('В наличии 5 кг')
  })
})
