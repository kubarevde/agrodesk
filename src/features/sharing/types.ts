export type SharingListingType = 'field' | 'equipment' | 'implement'
/** Legacy listings may still have type=parts in DB. */
export type SharingListingTypeAny = SharingListingType | 'parts'
export type SharingListingStatus = 'active' | 'paused' | 'done' | 'archived'
export type SharingRequestStatus = 'pending' | 'accepted' | 'rejected' | 'done'

export type SharingPriceFilter = {
  unit: string
  min: number | null
  max: number | null
}

export type SharingScope = 'full_field' | 'partial_field'

export type SharingListing = {
  id: string
  orgId: string | null
  type: SharingListingTypeAny
  title: string
  description: string | null
  pricePerUnit: number | null
  priceUnit: string | null
  fieldId: string | null
  equipmentId: string | null
  implementId: string | null
  region: string | null
  contactInfo: string | null
  lat: number | null
  lng: number | null
  status: SharingListingStatus
  ownerId: string
  ownerName: string
  fieldName: string | null
  equipmentName: string | null
  implementName: string | null
  implementCategoryLabel: string | null
  images: string[]
  requestsCount: number
  createdAt: string
  sharingScope: SharingScope
  sharedAreaHa: number | null
  effectivePolygon: number[][] | null
  effectiveAreaHa: number | null
}

export type SharingRequest = {
  id: string
  listingId: string
  message: string | null
  desiredFrom: string | null
  desiredTo: string | null
  status: SharingRequestStatus
  requesterId: string
  requesterName: string
  ownerResponse: string | null
  listingTitle: string
  listingType: string
  listingOwnerName: string | null
  listingContactInfo: string | null
  createdAt: string
}

export type SharingListingsFilters = {
  type?: SharingListingType
  status?: SharingListingStatus
  region?: string
}

export type SharingRequestCreateInput = {
  listingId: string
  message?: string
  desiredFrom?: string
  desiredTo?: string
}

export type SharingListingFormInput = {
  type: SharingListingType
  title: string
  description?: string
  pricePerUnit?: number | null
  priceUnit?: string | null
  fieldId?: string
  equipmentId?: string
  implementId?: string
  relatedEquipmentId?: string
  region?: string
  contactInfo?: string
  lat?: number | null
  lng?: number | null
  images?: string[]
  sharingScope?: SharingScope
  sharedPolygon?: number[][] | null
}

export type SharingListingUpdateInput = {
  title?: string
  description?: string
  pricePerUnit?: number | null
  priceUnit?: string | null
  region?: string
  contactInfo?: string
  lat?: number | null
  lng?: number | null
  images?: string[]
  sharingScope?: SharingScope
  sharedPolygon?: number[][] | null
}

export const SCOPE_LABELS: Record<SharingScope, string> = {
  full_field: 'Всё поле',
  partial_field: 'Часть поля',
}

export const PRICE_UNITS = [
  '₽/гектар',
  '₽/сутки',
  '₽/ч',
  '₽/т',
  '₽/месяц',
  'договорная',
] as const

export type PriceUnitOption = (typeof PRICE_UNITS)[number]

export const TYPE_LABELS: Record<SharingListingTypeAny, string> = {
  field: 'Поле',
  equipment: 'Техника',
  implement: 'Приспособления',
  parts: 'Прочее',
}

export const STATUS_LABELS: Record<SharingListingStatus, string> = {
  active: 'Активно',
  paused: 'Пауза',
  done: 'Завершено',
  archived: 'В архиве',
}

export const REQUEST_STATUS_LABELS: Record<SharingRequestStatus, string> = {
  pending: 'Ожидает',
  accepted: 'Принята',
  rejected: 'Отклонена',
  done: 'Завершена',
}

export const DEFAULT_PRICE_FILTER: SharingPriceFilter = {
  unit: 'all',
  min: null,
  max: null,
}
