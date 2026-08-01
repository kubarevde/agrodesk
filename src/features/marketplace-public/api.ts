import { publicMarketplaceApi } from './publicApi'
import type {
  PublicCategoryNode,
  PublicListingCard,
  PublicListingListResponse,
  PublicOrderCreate,
  PublicOrderResponse,
  PublicSellerProfile,
} from './types'

const BASE = '/api/public/marketplace'

export async function fetchPublicListings(params: {
  categoryId?: string | null
  q?: string
  page?: number
  pageSize?: number
  minPrice?: number
  maxPrice?: number
}): Promise<PublicListingListResponse> {
  const { data } = await publicMarketplaceApi.get<PublicListingListResponse>(`${BASE}/listings`, {
    params: {
      category_id: params.categoryId || undefined,
      q: params.q?.trim() || undefined,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 24,
      min_price: params.minPrice,
      max_price: params.maxPrice,
    },
  })
  return data
}

export async function fetchPublicListing(id: string): Promise<PublicListingCard> {
  const { data } = await publicMarketplaceApi.get<PublicListingCard>(`${BASE}/listings/${id}`)
  return data
}

export async function fetchPublicCategories(): Promise<PublicCategoryNode[]> {
  const { data } = await publicMarketplaceApi.get<PublicCategoryNode[]>(`${BASE}/categories`)
  return data
}

export async function fetchPublicSeller(id: string): Promise<PublicSellerProfile> {
  const { data } = await publicMarketplaceApi.get<PublicSellerProfile>(`${BASE}/sellers/${id}`)
  return data
}

export async function createPublicOrder(
  payload: PublicOrderCreate,
): Promise<PublicOrderResponse> {
  const { data } = await publicMarketplaceApi.post<PublicOrderResponse>(`${BASE}/orders`, payload)
  return data
}
