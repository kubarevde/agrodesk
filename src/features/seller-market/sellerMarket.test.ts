import { describe, expect, it } from 'vitest'
import { listingFormSchema } from './components/ListingFormFields'
import { isListingFormReady, listingRejectionVisible } from './labels'

describe('isListingFormReady', () => {
  it('requires title, category, price, quantity and photos', () => {
    expect(
      isListingFormReady({
        title: '',
        price: 0,
        quantity_available: 0,
        category_id: '',
        photos: [],
      }),
    ).toEqual([
      'Укажите название',
      'Выберите категорию',
      'Цена должна быть больше 0',
      'Количество должно быть больше 0',
      'Добавьте хотя бы одно фото',
    ])
  })

  it('passes when all required fields are set', () => {
    expect(
      isListingFormReady({
        title: 'Мёд',
        price: 500,
        quantity_available: 10,
        category_id: 'cat-1',
        photos: ['/uploads/marketplace/a.jpg'],
      }),
    ).toEqual([])
  })
})

describe('listingFormSchema photo limit', () => {
  it('rejects more than 8 photos', () => {
    const photos = Array.from({ length: 9 }, (_, i) => `/uploads/marketplace/${i}.jpg`)
    const parsed = listingFormSchema.safeParse({
      title: 'X',
      price: 1,
      unit: 'кг',
      quantity_available: 1,
      photos,
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts 8 photos', () => {
    const photos = Array.from({ length: 8 }, (_, i) => `/uploads/marketplace/${i}.jpg`)
    const parsed = listingFormSchema.safeParse({
      title: 'X',
      price: 1,
      unit: 'кг',
      quantity_available: 1,
      photos,
    })
    expect(parsed.success).toBe(true)
  })
})

describe('listingRejectionVisible', () => {
  it('returns rejection_reason for rejected listings', () => {
    expect(
      listingRejectionVisible({
        status: 'rejected',
        rejection_reason: 'Недостаточно фото товара',
      }),
    ).toBe('Недостаточно фото товара')
  })

  it('hides reason for non-rejected statuses', () => {
    expect(
      listingRejectionVisible({
        status: 'draft',
        rejection_reason: 'старая причина',
      }),
    ).toBeNull()
  })
})
