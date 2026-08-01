import { superadminApi } from './api'
import type {
  AdminCategory,
  AdminCategoryCreate,
  AdminCategoryMapping,
  AdminCategoryUpdate,
  AdminOrder,
  AdminSeller,
  AdminSellerUpdate,
  ModerationListing,
} from './marketplaceTypes'

type ApiRecord = Record<string, unknown>

const BASE = '/superadmin/api/marketplace'

function str(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v)
}

function strOrNull(v: unknown): string | null {
  return v == null || v === '' ? null : String(v)
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function photos(v: unknown): string[] {
  return Array.isArray(v) ? v.map((p) => String(p)) : []
}

function mapListing(raw: ApiRecord): ModerationListing {
  return {
    id: str(raw.id),
    orgId: str(raw.org_id),
    orgName: str(raw.org_name),
    sellerProfileId: str(raw.seller_profile_id),
    sellerDisplayName: str(raw.seller_display_name),
    categoryId: strOrNull(raw.category_id),
    title: str(raw.title),
    description: strOrNull(raw.description),
    price: (raw.price as number | string) ?? 0,
    unit: str(raw.unit),
    quantityAvailable: (raw.quantity_available as number | string) ?? 0,
    photos: photos(raw.photos),
    status: str(raw.status),
    rejectionReason: strOrNull(raw.rejection_reason),
    createdAt: str(raw.created_at),
    updatedAt: str(raw.updated_at),
    publishedAt: strOrNull(raw.published_at),
  }
}

function mapCategory(raw: ApiRecord): AdminCategory {
  return {
    id: str(raw.id),
    name: str(raw.name),
    slug: str(raw.slug),
    parentId: strOrNull(raw.parent_id),
    icon: strOrNull(raw.icon),
    isActive: bool(raw.is_active, true),
    sortOrder: Number(raw.sort_order ?? 0),
  }
}

function mapSeller(raw: ApiRecord): AdminSeller {
  return {
    id: str(raw.id),
    orgId: str(raw.org_id),
    orgName: str(raw.org_name),
    displayName: str(raw.display_name),
    description: strOrNull(raw.description),
    logoUrl: strOrNull(raw.logo_url),
    phone: strOrNull(raw.phone),
    isVerified: bool(raw.is_verified),
    isActive: bool(raw.is_active, true),
    createdAt: str(raw.created_at),
    publishedListings: Number(raw.published_listings ?? 0),
  }
}

function mapOrder(raw: ApiRecord): AdminOrder {
  return {
    id: str(raw.id),
    listingId: str(raw.listing_id),
    listingTitle: str(raw.listing_title),
    orgId: str(raw.org_id),
    orgName: str(raw.org_name),
    sellerDisplayName: str(raw.seller_display_name),
    buyerName: str(raw.buyer_name),
    buyerPhone: str(raw.buyer_phone),
    buyerComment: strOrNull(raw.buyer_comment),
    quantity: (raw.quantity as number | string) ?? 0,
    status: str(raw.status),
    createdAt: str(raw.created_at),
    updatedAt: str(raw.updated_at),
  }
}

/** Pure helpers — used by UI and Vitest. */
export function validateRejectionReason(reason: string): string | null {
  const trimmed = reason.trim()
  if (trimmed.length < 3) return 'Укажите причину отклонения (минимум 3 символа)'
  if (trimmed.length > 2000) return 'Причина слишком длинная (макс. 2000)'
  return null
}

export function buildRejectPayload(reason: string): { rejection_reason: string } {
  return { rejection_reason: reason.trim() }
}

export function hasSuperadminSession(token: string | null | undefined): boolean {
  return Boolean(token && token.length > 0)
}

export async function fetchModerationListings(
  status = 'pending_review',
): Promise<ModerationListing[]> {
  const { data } = await superadminApi.get<ApiRecord[]>(`${BASE}/listings`, {
    params: { status },
  })
  return data.map(mapListing)
}

export async function approveModerationListing(id: string): Promise<ModerationListing> {
  const { data } = await superadminApi.post<ApiRecord>(`${BASE}/listings/${id}/approve`)
  return mapListing(data)
}

export async function rejectModerationListing(
  id: string,
  reason: string,
): Promise<ModerationListing> {
  const error = validateRejectionReason(reason)
  if (error) throw new Error(error)
  const { data } = await superadminApi.post<ApiRecord>(
    `${BASE}/listings/${id}/reject`,
    buildRejectPayload(reason),
  )
  return mapListing(data)
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const { data } = await superadminApi.get<ApiRecord[]>(`${BASE}/categories`)
  return data.map(mapCategory)
}

export async function createAdminCategory(
  payload: AdminCategoryCreate,
): Promise<AdminCategory> {
  const { data } = await superadminApi.post<ApiRecord>(`${BASE}/categories`, {
    name: payload.name,
    slug: payload.slug,
    parent_id: payload.parentId ?? null,
    icon: payload.icon ?? null,
    sort_order: payload.sortOrder ?? 0,
    is_active: payload.isActive ?? true,
  })
  return mapCategory(data)
}

export async function updateAdminCategory(
  id: string,
  payload: AdminCategoryUpdate,
): Promise<AdminCategory> {
  const body: Record<string, unknown> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (payload.slug !== undefined) body.slug = payload.slug
  if (payload.parentId !== undefined) body.parent_id = payload.parentId
  if (payload.icon !== undefined) body.icon = payload.icon
  if (payload.sortOrder !== undefined) body.sort_order = payload.sortOrder
  if (payload.isActive !== undefined) body.is_active = payload.isActive
  const { data } = await superadminApi.patch<ApiRecord>(`${BASE}/categories/${id}`, body)
  return mapCategory(data)
}

export async function fetchAdminSellers(orgId?: string): Promise<AdminSeller[]> {
  const { data } = await superadminApi.get<ApiRecord[]>(`${BASE}/sellers`, {
    params: orgId ? { org_id: orgId } : undefined,
  })
  return data.map(mapSeller)
}

export async function updateAdminSeller(
  id: string,
  payload: AdminSellerUpdate,
): Promise<AdminSeller> {
  const body: Record<string, unknown> = {}
  if (payload.isVerified !== undefined) body.is_verified = payload.isVerified
  if (payload.isActive !== undefined) body.is_active = payload.isActive
  if (payload.displayName !== undefined) body.display_name = payload.displayName
  const { data } = await superadminApi.patch<ApiRecord>(`${BASE}/sellers/${id}`, body)
  return mapSeller(data)
}

export async function fetchAdminOrders(status?: string): Promise<AdminOrder[]> {
  const { data } = await superadminApi.get<ApiRecord[]>(`${BASE}/orders`, {
    params: status ? { status } : undefined,
  })
  return data.map(mapOrder)
}

function mapMapping(raw: ApiRecord): AdminCategoryMapping {
  return {
    id: str(raw.id),
    inventoryCategoryValue: str(raw.inventory_category_value),
    marketCategoryId: str(raw.market_category_id),
    marketCategoryName: strOrNull(raw.market_category_name),
  }
}

export async function fetchCategoryMappings(): Promise<AdminCategoryMapping[]> {
  const { data } = await superadminApi.get<ApiRecord[]>(`${BASE}/category-mappings`)
  return data.map(mapMapping)
}

export async function upsertCategoryMapping(payload: {
  inventoryCategoryValue: string
  marketCategoryId: string
}): Promise<AdminCategoryMapping> {
  const { data } = await superadminApi.put<ApiRecord>(`${BASE}/category-mappings`, {
    inventory_category_value: payload.inventoryCategoryValue,
    market_category_id: payload.marketCategoryId,
  })
  return mapMapping(data)
}

export async function deleteCategoryMapping(id: string): Promise<void> {
  await superadminApi.delete(`${BASE}/category-mappings/${id}`)
}
