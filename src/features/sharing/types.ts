export type SharingListingType = 'field' | 'equipment' | 'implement' | 'parts'
export type SharingListingStatus = 'active' | 'paused' | 'done'
export type SharingRequestStatus = 'pending' | 'accepted' | 'rejected' | 'done'
export type PriceFilter = 'all' | 'priced' | 'negotiable'

export type SharingListing = {
  id: string
  type: SharingListingType
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
}

export const PRICE_UNITS = ['₽/га', '₽/сутки', '₽/ч', '₽/т', 'договорная'] as const

export const TYPE_LABELS: Record<SharingListingType, string> = {
  field: 'Поле',
  equipment: 'Техника',
  implement: 'Приспособление',
  parts: 'Прочее',
}

export const STATUS_LABELS: Record<SharingListingStatus, string> = {
  active: 'Активно',
  paused: 'Пауза',
  done: 'Завершено',
}

export const REQUEST_STATUS_LABELS: Record<SharingRequestStatus, string> = {
  pending: 'Ожидает',
  accepted: 'Принята',
  rejected: 'Отклонена',
  done: 'Завершена',
}
