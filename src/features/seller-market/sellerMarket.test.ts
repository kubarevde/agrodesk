import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { listingFormSchema } from './components/ListingFormFields'
import {
  isListingFormReady,
  isSourceLinkedListing,
  listingListActionLabel,
  listingQtyListCaption,
  listingRejectionVisible,
  listingSourceLinkLabel,
  parseImportFromSourceError,
} from './labels'

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

describe('listingListActionLabel', () => {
  it('uses fix/edit labels for rejected and draft', () => {
    expect(listingListActionLabel('rejected')).toBe('Исправить')
    expect(listingListActionLabel('draft')).toBe('Редактировать')
    expect(listingListActionLabel('pending_review')).toBe('Открыть')
    expect(listingListActionLabel('published')).toBe('Открыть')
  })
})

describe('parseImportFromSourceError', () => {
  it('reads listing_id from structured 409 detail', () => {
    const err = new AxiosError('Conflict')
    err.response = {
      status: 409,
      data: {
        detail: {
          message: 'Объявление по этому источнику уже есть (статус «draft»).',
          listing_id: 'listing-42',
          status: 'draft',
        },
      },
      statusText: 'Conflict',
      headers: {},
      config: { headers: {} },
    }
    expect(parseImportFromSourceError(err)).toEqual({
      message: 'Объявление по этому источнику уже есть (статус «draft»).',
      listingId: 'listing-42',
    })
  })

  it('falls back for plain 409', () => {
    const err = new AxiosError('Conflict')
    err.response = {
      status: 409,
      data: {},
      statusText: 'Conflict',
      headers: {},
      config: { headers: {} },
    }
    const parsed = parseImportFromSourceError(err)
    expect(parsed.listingId).toBeNull()
    expect(parsed.message.toLowerCase()).toContain('уже')
  })
})

describe('listingSourceLinkLabel', () => {
  it('labels inventory and shipment source links', () => {
    expect(listingSourceLinkLabel('inventory')).toMatch(/складом/i)
    expect(listingSourceLinkLabel('shipment')).toMatch(/отгруз/i)
    expect(listingSourceLinkLabel('manual')).toBeNull()
  })
})

describe('isSourceLinkedListing', () => {
  it('detects source mode and source_type+id', () => {
    expect(isSourceLinkedListing({ quantity_mode: 'source' })).toBe(true)
    expect(
      isSourceLinkedListing({
        quantity_mode: 'manual',
        source_type: 'inventory',
        source_id: 'x',
      }),
    ).toBe(true)
    expect(isSourceLinkedListing({ quantity_mode: 'manual', source_type: 'manual' })).toBe(false)
  })
})

describe('listingQtyListCaption', () => {
  it('keeps manual qty plain and marks source sync', () => {
    expect(
      listingQtyListCaption({
        quantity_available: 5,
        unit: 'кг',
        quantity_mode: 'manual',
      }),
    ).toBe('5 кг')
    expect(
      listingQtyListCaption({
        quantity_available: 12,
        unit: 'л',
        quantity_mode: 'source',
        source_type: 'inventory',
        source_id: 'i1',
      }),
    ).toMatch(/синхр\. со складом/)
    expect(
      listingQtyListCaption({
        quantity_available: 0,
        unit: 'кг',
        quantity_mode: 'source',
        source_type: 'shipment',
        source_id: 's1',
        source_missing: true,
      }),
    ).toMatch(/источник недоступен/)
  })
})

describe('orders report period helpers', () => {
  it('defaultReportPeriod returns local ISO month-to-date', async () => {
    const { defaultReportPeriod } = await import(
      './components/OrdersReportPanel'
    )
    const { from, to } = defaultReportPeriod()
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(from <= to).toBe(true)
    expect(from.slice(8)).toBe('01')
  })
})
