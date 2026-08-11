import type { FieldResponse } from '@/features/fields/types'
import { humanLabel } from '@/lib/display'
import type {
  SharingListing,
  SharingListingType,
  SharingListingTypeAny,
  SharingPriceFilter,
} from './types'
import { TYPE_LABELS } from './types'

/** Normalize legacy «₽/га» to «₽/гектар» for filters and display. */
export function normalizePriceUnit(unit: string | null | undefined): string {
  if (!unit) return ''
  const trimmed = unit.trim()
  if (trimmed === '₽/га') return '₽/гектар'
  return trimmed
}

export function formatListingPrice(listing: SharingListing): string {
  const unit = normalizePriceUnit(listing.priceUnit)
  if (unit === 'договорная' || (listing.pricePerUnit == null && !unit)) {
    return 'Договорная'
  }
  if (listing.pricePerUnit != null && unit) {
    return `${listing.pricePerUnit.toLocaleString('ru-RU')} ${unit}`
  }
  if (listing.pricePerUnit != null) {
    return `${listing.pricePerUnit.toLocaleString('ru-RU')} ₽`
  }
  return 'Договорная'
}

export function isNegotiable(listing: SharingListing): boolean {
  if (listing.pricePerUnit == null) return true
  const unit = normalizePriceUnit(listing.priceUnit).toLowerCase()
  return unit.includes('договор')
}

export function matchesPriceFilter(
  listing: SharingListing,
  filter: SharingPriceFilter,
): boolean {
  const unitFilter = filter.unit === 'all' ? null : normalizePriceUnit(filter.unit)
  const listingUnit = normalizePriceUnit(listing.priceUnit)
  const negotiable = isNegotiable(listing)

  if (unitFilter === 'договорная') {
    return negotiable
  }

  if (unitFilter) {
    if (negotiable) return false
    if (listingUnit !== unitFilter) return false
  }

  if (filter.min == null && filter.max == null) return true
  if (negotiable) return false
  const amount = listing.pricePerUnit
  if (amount == null) return false
  if (filter.min != null && amount < filter.min) return false
  if (filter.max != null && amount > filter.max) return false
  return true
}

export function typeBadgeLabel(type: SharingListingTypeAny): string {
  return TYPE_LABELS[type] ?? type
}

export function mapMarkerColor(
  type: SharingListingTypeAny,
): 'green' | 'blue' | 'yellow' | 'gray' {
  switch (type) {
    case 'field':
      return 'green'
    case 'equipment':
      return 'blue'
    case 'implement':
      return 'yellow'
    default:
      return 'gray'
  }
}

/**
 * Contour to draw on sharing maps.
 * Prefer API effective_polygon (works cross-org). For full_field only, fall back to
 * own-org field polygon when the listing payload has no contour yet.
 * Never fall back to the full field for partial_field listings.
 */
export function resolveListingPolygon(
  listing: SharingListing,
  field?: FieldResponse | null,
): number[][] | null {
  if (listing.type !== 'field') return null
  const fromApi = listing.effectivePolygon
  if (fromApi && fromApi.length >= 3) return fromApi
  if (listing.sharingScope === 'partial_field') return null
  const fromField = field?.polygon
  if (fromField && fromField.length >= 3) return fromField
  return null
}

export function resourceLabel(
  listing: SharingListing,
  field?: FieldResponse | null,
): string | null {
  if (listing.type === 'field') {
    const fieldName = humanLabel(listing.fieldName, '')
    if (!fieldName) return null
    const areaHa =
      listing.effectiveAreaHa ??
      listing.sharedAreaHa ??
      (listing.sharingScope === 'full_field' ? field?.area_ha : null) ??
      null
    const area = areaHa != null ? `${areaHa} га` : null
    const scope =
      listing.sharingScope === 'partial_field' ? 'часть поля' : null
    const parts = [fieldName, scope, area].filter(Boolean)
    if (parts.length === 1) return fieldName
    return `${fieldName} — ${[scope, area].filter(Boolean).join(', ')}`
  }
  if (listing.type === 'equipment') {
    return humanLabel(listing.equipmentName, '') || null
  }
  if (listing.type === 'implement') {
    const implementName = humanLabel(listing.implementName, '')
    if (!implementName) return null
    if (listing.implementCategoryLabel) {
      return `${implementName} (${listing.implementCategoryLabel})`
    }
    return implementName
  }
  return null
}

export function formatRequestDate(value: string | null): string {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-')
    return `${day}.${month}.${year}`
  }
  return value
}

export function formatRequestDates(from: string | null, to: string | null): string {
  if (!from && !to) return '—'
  if (from && to) return `${formatRequestDate(from)} — ${formatRequestDate(to)}`
  return formatRequestDate(from ?? to)
}

export function requestsBadgeLabel(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} заявка`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} заявки`
  }
  return `${count} заявок`
}

/** Soft-deleted / archived listings (including legacy status=done). */
export function isArchivedListing(listing: Pick<SharingListing, 'status'>): boolean {
  return listing.status === 'archived' || listing.status === 'done'
}

export function isCreatableListingType(type: string): type is SharingListingType {
  return type === 'field' || type === 'equipment' || type === 'implement'
}
