import { api } from '@/lib/api'
import type {
  ImportSources,
  MarketOrdersReport,
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

export async function fetchOrdersReport(params: {
  from_date: string
  to_date: string
  status?: string
}): Promise<MarketOrdersReport> {
  const { data } = await api.get<MarketOrdersReport>(`${BASE}/reports/orders`, {
    params: {
      from_date: params.from_date,
      to_date: params.to_date,
      ...(params.status ? { status: params.status } : {}),
    },
  })
  return data
}

/** Local blob download — do not import from features/reports (module boundary). */
export async function downloadOrdersReportExcel(params: {
  from_date: string
  to_date: string
  status?: string
  filename: string
}): Promise<void> {
  const response = await api.post<Blob>(
    `${BASE}/reports/orders/export`,
    {
      from_date: params.from_date,
      to_date: params.to_date,
      ...(params.status ? { status: params.status } : {}),
    },
    { responseType: 'blob' },
  )
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(response.data)
  link.href = objectUrl
  link.download = params.filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

/** Categories come from the public taxonomy (no JWT required on that path). */
export async function fetchMarketCategories(): Promise<PublicCategoryNode[]> {
  const { data } = await api.get<PublicCategoryNode[]>(
    '/api/public/marketplace/categories',
  )
  return data
}
