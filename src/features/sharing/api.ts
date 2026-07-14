import type {
  SharingListing,
  SharingListingsFilters,
  SharingRequest,
  SharingRequestCreateInput,
  SharingListingType,
  SharingListingStatus,
  SharingRequestStatus,
} from './types'

type ApiRecord = Record<string, unknown>

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toStringOrNull(value: unknown): string | null {
  if (value == null || value === '') return null
  return String(value)
}

export function listingFromApi(raw: ApiRecord): SharingListing {
  const images = Array.isArray(raw.images)
    ? raw.images.map((item) => String(item))
    : []

  return {
    id: String(raw.id),
    type: raw.type as SharingListingType,
    title: String(raw.title ?? ''),
    description: toStringOrNull(raw.description),
    pricePerUnit: toNumber(raw.price_per_unit),
    priceUnit: toStringOrNull(raw.price_unit),
    fieldId: toStringOrNull(raw.field_id),
    equipmentId: toStringOrNull(raw.equipment_id),
    implementId: toStringOrNull(raw.implement_id),
    region: toStringOrNull(raw.region),
    contactInfo: toStringOrNull(raw.contact_info),
    lat: toNumber(raw.lat),
    lng: toNumber(raw.lng),
    status: (raw.status as SharingListingStatus) ?? 'active',
    ownerId: String(raw.owner_id),
    ownerName: String(raw.owner_name ?? ''),
    fieldName: toStringOrNull(raw.field_name),
    equipmentName: toStringOrNull(raw.equipment_name),
    implementName: toStringOrNull(raw.implement_name),
    implementCategoryLabel: toStringOrNull(raw.implement_category_label),
    images,
    requestsCount: Number(raw.requests_count ?? 0),
    createdAt: String(raw.created_at ?? ''),
  }
}

export function requestFromApi(raw: ApiRecord): SharingRequest {
  return {
    id: String(raw.id),
    listingId: String(raw.listing_id),
    message: toStringOrNull(raw.message),
    desiredFrom: toStringOrNull(raw.desired_from),
    desiredTo: toStringOrNull(raw.desired_to),
    status: (raw.status as SharingRequestStatus) ?? 'pending',
    requesterId: String(raw.requester_id),
    requesterName: String(raw.requester_name ?? ''),
    ownerResponse: toStringOrNull(raw.owner_response),
    listingTitle: String(raw.listing_title ?? ''),
    listingType: String(raw.listing_type ?? ''),
    listingOwnerName: toStringOrNull(raw.listing_owner_name),
    listingContactInfo: toStringOrNull(raw.listing_contact_info),
    createdAt: String(raw.created_at ?? ''),
  }
}

export function listingsFiltersToApi(filters: SharingListingsFilters): ApiRecord {
  const params: ApiRecord = {}
  if (filters.type) params.type = filters.type
  if (filters.status) params.status = filters.status
  if (filters.region?.trim()) params.region = filters.region.trim()
  return params
}

export function requestCreateToApi(input: SharingRequestCreateInput): ApiRecord {
  return {
    listing_id: input.listingId,
    message: input.message || undefined,
    desired_from: input.desiredFrom || undefined,
    desired_to: input.desiredTo || undefined,
  }
}

export function listingCreateToApi(input: {
  type: SharingListingType
  title: string
  description?: string
  pricePerUnit?: number | null
  priceUnit?: string | null
  fieldId?: string
  equipmentId?: string
  implementId?: string
  region?: string
  contactInfo?: string
  lat?: number | null
  lng?: number | null
  images?: string[]
}): ApiRecord {
  return {
    type: input.type,
    title: input.title,
    description: input.description || undefined,
    price_per_unit: input.pricePerUnit ?? undefined,
    price_unit: input.priceUnit || undefined,
    field_id: input.fieldId || undefined,
    equipment_id: input.equipmentId || undefined,
    implement_id: input.implementId || undefined,
    region: input.region || undefined,
    contact_info: input.contactInfo || undefined,
    lat: input.lat ?? undefined,
    lng: input.lng ?? undefined,
    images: input.images?.length ? input.images : undefined,
  }
}

export function listingUpdateToApi(input: {
  title?: string
  description?: string
  pricePerUnit?: number | null
  priceUnit?: string | null
  region?: string
  contactInfo?: string
  lat?: number | null
  lng?: number | null
  images?: string[]
}): ApiRecord {
  const body: ApiRecord = {}
  if (input.title !== undefined) body.title = input.title
  if (input.description !== undefined) body.description = input.description || null
  if (input.pricePerUnit !== undefined) body.price_per_unit = input.pricePerUnit
  if (input.priceUnit !== undefined) body.price_unit = input.priceUnit || null
  if (input.region !== undefined) body.region = input.region || null
  if (input.contactInfo !== undefined) body.contact_info = input.contactInfo || null
  if (input.lat !== undefined) body.lat = input.lat
  if (input.lng !== undefined) body.lng = input.lng
  if (input.images !== undefined) body.images = input.images
  return body
}
