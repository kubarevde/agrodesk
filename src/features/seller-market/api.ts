import { api } from '@/lib/api'
import type {
  ImportSources,
  PublicCategoryNode,
  SellerListing,
  SellerListingList,
  SellerOrder,
  SellerProfile,
} from './types'

const BASE = '/api/marketplace'

export async function fetchSellerProfile(): Promise<SellerProfile> {
  const { data } = await api.get<SellerProfile>(`${BASE}/seller-profile`)
  return data
}

export async function updateSellerProfile(
  payload: Partial<
    Pick<SellerProfile, 'display_name' | 'description' | 'logo_url' | 'phone'>
  >,
): Promise<SellerProfile> {
  const { data } = await api.patch<SellerProfile>(`${BASE}/seller-profile`, payload)
  return data
}

export async function fetchSellerListings(status?: string): Promise<SellerListingList> {
  const { data } = await api.get<SellerListingList>(`${BASE}/listings`, {
    params: status ? { status } : undefined,
  })
  return data
}

export async function fetchSellerListing(id: string): Promise<SellerListing> {
  const { data } = await api.get<SellerListing>(`${BASE}/listings/${id}`)
  return data
}

export async function createSellerListing(payload: {
  title: string
  description?: string | null
  price: number
  unit: string
  quantity_available: number
  category_id?: string | null
  photos?: string[]
}): Promise<SellerListing> {
  const { data } = await api.post<SellerListing>(`${BASE}/listings`, payload)
  return data
}

export async function updateSellerListing(
  id: string,
  payload: Record<string, unknown>,
): Promise<SellerListing> {
  const { data } = await api.patch<SellerListing>(`${BASE}/listings/${id}`, payload)
  return data
}

export async function submitSellerListing(id: string): Promise<SellerListing> {
  const { data } = await api.post<SellerListing>(`${BASE}/listings/${id}/submit`)
  return data
}

export async function archiveSellerListing(id: string): Promise<SellerListing> {
  const { data } = await api.post<SellerListing>(`${BASE}/listings/${id}/archive`)
  return data
}

export async function fetchImportSources(): Promise<ImportSources> {
  const { data } = await api.get<ImportSources>(`${BASE}/import-sources`)
  return data
}

export async function importListingFromSource(payload: {
  source_type: 'inventory' | 'shipment'
  source_id: string
}): Promise<SellerListing> {
  const { data } = await api.post<SellerListing>(`${BASE}/listings/from-source`, payload)
  return data
}

export async function fetchSellerOrders(status?: string): Promise<SellerOrder[]> {
  const { data } = await api.get<SellerOrder[]>(`${BASE}/orders`, {
    params: status ? { status } : undefined,
  })
  return data
}

export async function updateSellerOrderStatus(
  id: string,
  status: string,
): Promise<SellerOrder> {
  const { data } = await api.patch<SellerOrder>(`${BASE}/orders/${id}`, { status })
  return data
}

/** Categories come from the public taxonomy (no JWT required on that path). */
export async function fetchMarketCategories(): Promise<PublicCategoryNode[]> {
  const { data } = await api.get<PublicCategoryNode[]>(
    '/api/public/marketplace/categories',
  )
  return data
}
