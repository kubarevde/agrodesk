import { describe, expect, it } from 'vitest'
import {
  isArchivedListing,
  matchesPriceFilter,
  normalizePriceUnit,
  resolveListingPolygon,
} from './utils'
import type { SharingListing } from './types'

const poly = [
  [51.7, 36.1],
  [51.7, 36.2],
  [51.8, 36.15],
]

function listing(partial: Partial<SharingListing>): SharingListing {
  return {
    id: '1',
    orgId: null,
    type: 'field',
    title: 't',
    description: null,
    pricePerUnit: null,
    priceUnit: null,
    fieldId: 'f1',
    equipmentId: null,
    implementId: null,
    region: null,
    contactInfo: null,
    lat: 51.7,
    lng: 36.1,
    status: 'active',
    ownerId: 'o',
    ownerName: 'o',
    fieldName: 'Поле',
    equipmentName: null,
    implementName: null,
    implementCategoryLabel: null,
    images: [],
    requestsCount: 0,
    createdAt: '',
    sharingScope: 'full_field',
    sharedAreaHa: null,
    effectivePolygon: null,
    effectiveAreaHa: null,
    ...partial,
  }
}

describe('resolveListingPolygon', () => {
  it('prefers effective polygon from API', () => {
    expect(
      resolveListingPolygon(listing({ effectivePolygon: poly }), {
        id: 'f1',
        polygon: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      } as never),
    ).toEqual(poly)
  })

  it('falls back to own-org field polygon for full_field only', () => {
    const fieldPoly = [
      [10, 20],
      [11, 20],
      [11, 21],
    ]
    expect(
      resolveListingPolygon(listing({ sharingScope: 'full_field' }), {
        polygon: fieldPoly,
      } as never),
    ).toEqual(fieldPoly)
    expect(
      resolveListingPolygon(listing({ sharingScope: 'partial_field' }), {
        polygon: fieldPoly,
      } as never),
    ).toBeNull()
  })
})

describe('sharing utils archive', () => {
  it('treats archived and legacy done as archive', () => {
    expect(isArchivedListing({ status: 'archived' })).toBe(true)
    expect(isArchivedListing({ status: 'done' })).toBe(true)
    expect(isArchivedListing({ status: 'active' })).toBe(false)
    expect(isArchivedListing({ status: 'paused' })).toBe(false)
  })
})

describe('sharing price filter', () => {
  it('normalizes legacy ₽/га', () => {
    expect(normalizePriceUnit('₽/га')).toBe('₽/гектар')
  })

  it('filters by unit and range', () => {
    const listing = {
      pricePerUnit: 1500,
      priceUnit: '₽/га',
    } as Parameters<typeof matchesPriceFilter>[0]

    expect(
      matchesPriceFilter(listing, { unit: '₽/гектар', min: 1000, max: 2000 }),
    ).toBe(true)
    expect(
      matchesPriceFilter(listing, { unit: '₽/гектар', min: 2000, max: null }),
    ).toBe(false)
    expect(
      matchesPriceFilter(listing, { unit: '₽/сутки', min: null, max: null }),
    ).toBe(false)
  })

  it('filters negotiable by unit', () => {
    const listing = {
      pricePerUnit: null,
      priceUnit: 'договорная',
    } as Parameters<typeof matchesPriceFilter>[0]

    expect(matchesPriceFilter(listing, { unit: 'договорная', min: null, max: null })).toBe(
      true,
    )
    expect(matchesPriceFilter(listing, { unit: '₽/месяц', min: null, max: null })).toBe(false)
  })
})
