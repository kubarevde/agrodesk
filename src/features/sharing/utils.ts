import type { FieldResponse } from '@/features/fields/types'
import { humanLabel } from '@/lib/display'
import type { PriceFilter, SharingListing, SharingListingType } from './types'
import { TYPE_LABELS } from './types'

export function formatListingPrice(listing: SharingListing): string {
  if (listing.pricePerUnit != null && listing.priceUnit) {
    return `${listing.pricePerUnit.toLocaleString('ru-RU')} ${listing.priceUnit}`
  }
  if (listing.pricePerUnit != null) {
    return `${listing.pricePerUnit.toLocaleString('ru-RU')} ₽`
  }
  return 'Договорная'
}

export function isNegotiable(listing: SharingListing): boolean {
  if (listing.pricePerUnit == null) return true
  const unit = (listing.priceUnit ?? '').toLowerCase()
  return unit.includes('договор')
}

export function matchesPriceFilter(listing: SharingListing, filter: PriceFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'priced') return listing.pricePerUnit != null && !isNegotiable(listing)
  return isNegotiable(listing)
}

export function typeBadgeLabel(type: SharingListingType): string {
  return TYPE_LABELS[type]
}

export function mapMarkerColor(
  type: SharingListingType,
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

export function resourceLabel(
  listing: SharingListing,
  field?: FieldResponse | null,
): string | null {
  if (listing.type === 'field') {
    const fieldName = humanLabel(listing.fieldName, '')
    if (!fieldName) return null
    const area = field?.area_ha != null ? `${field.area_ha} га` : null
    const crop = field?.crop_type ?? null
    const parts = [fieldName, area, crop].filter(Boolean)
    if (parts.length === 1) return fieldName
    return `${fieldName} — ${[area, crop].filter(Boolean).join(', ')}`
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
