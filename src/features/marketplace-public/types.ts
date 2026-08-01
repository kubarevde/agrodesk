export interface PublicSellerBrief {
  id: string
  display_name: string
  is_verified: boolean
}

export interface PublicListingCard {
  id: string
  title: string
  description: string | null
  price: number | string
  unit: string
  /** Effective availability from backend (live for source-linked listings). */
  quantity_available: number | string
  photos: string[]
  category_id: string | null
  published_at: string | null
  seller: PublicSellerBrief
}

export interface PublicListingListResponse {
  items: PublicListingCard[]
  total: number
  page: number
  page_size: number
}

export interface PublicCategoryNode {
  id: string
  name: string
  slug: string
  icon: string | null
  sort_order: number
  children: PublicCategoryNode[]
}

export interface PublicReviewCard {
  id: string
  author_name: string
  rating: number
  comment: string | null
  created_at: string
}

export interface PublicSellerProfile {
  id: string
  display_name: string
  description: string | null
  logo_url: string | null
  phone: string | null
  is_verified: boolean
  listings: PublicListingCard[]
  reviews: PublicReviewCard[]
}

export interface PublicOrderCreate {
  listing_id: string
  buyer_name: string
  buyer_phone: string
  buyer_comment?: string | null
  quantity: number
}

export interface PublicOrderResponse {
  id: string
  listing_id: string
  buyer_name: string
  quantity: number | string
  status: string
  created_at: string
}

export type CatalogSort = 'date_desc' | 'date_asc' | 'price_asc' | 'price_desc'

export interface CatalogQuery {
  categoryId: string | null
  q: string
  sort: CatalogSort
  page: number
}
