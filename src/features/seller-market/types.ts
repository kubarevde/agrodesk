export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived'

export type OrderStatus = 'new' | 'contacted' | 'confirmed' | 'completed' | 'cancelled'

export interface SellerProfile {
  id: string
  org_id: string
  display_name: string
  description: string | null
  logo_url: string | null
  phone: string | null
  is_verified: boolean
  is_active: boolean
  created_at: string
}

export interface SellerListing {
  id: string
  org_id: string
  seller_profile_id: string
  category_id: string | null
  title: string
  description: string | null
  price: number | string
  unit: string
  quantity_available: number | string
  /** Effective qty mode from backend: stored vs live source. */
  quantity_mode?: 'manual' | 'source'
  source_missing?: boolean
  photos: string[]
  status: ListingStatus
  source_type: string | null
  source_id: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface SellerListingList {
  items: SellerListing[]
  total: number
}

export interface SellerOrder {
  id: string
  listing_id: string
  listing_title: string
  buyer_name: string
  buyer_phone: string
  buyer_comment: string | null
  quantity: number | string
  status: OrderStatus
  created_at: string
  updated_at: string
}

export interface ImportInventorySource {
  source_type: 'inventory'
  source_id: string
  name: string
  quantity: number | string
  unit: string
  category?: string | null
  already_imported: boolean
}

export interface ImportShipmentSource {
  source_type: 'shipment'
  source_id: string
  name: string
  quantity: number | string
  unit: string
  date?: string | null
  destination?: string | null
  already_imported: boolean
}

export interface ImportSources {
  inventory: ImportInventorySource[]
  shipments: ImportShipmentSource[]
}

/** Categories from public marketplace tree (same JSON shape as /api/public/marketplace/categories). */
export type { PublicCategoryNode } from '@/features/marketplace-public/types'
