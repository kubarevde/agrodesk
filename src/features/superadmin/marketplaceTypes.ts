export type ModerationListing = {
  id: string
  orgId: string
  orgName: string
  sellerProfileId: string
  sellerDisplayName: string
  categoryId: string | null
  title: string
  description: string | null
  price: number | string
  unit: string
  quantityAvailable: number | string
  photos: string[]
  status: string
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export type AdminCategory = {
  id: string
  name: string
  slug: string
  parentId: string | null
  icon: string | null
  isActive: boolean
  sortOrder: number
}

export type AdminCategoryCreate = {
  name: string
  slug: string
  parentId?: string | null
  icon?: string | null
  sortOrder?: number
  isActive?: boolean
}

export type AdminCategoryUpdate = Partial<AdminCategoryCreate>

export type AdminSeller = {
  id: string
  orgId: string
  orgName: string
  displayName: string
  description: string | null
  logoUrl: string | null
  phone: string | null
  isVerified: boolean
  isActive: boolean
  createdAt: string
  publishedListings: number
}

export type AdminSellerUpdate = {
  isVerified?: boolean
  isActive?: boolean
  displayName?: string
}

export type AdminOrder = {
  id: string
  listingId: string
  listingTitle: string
  orgId: string
  orgName: string
  sellerDisplayName: string
  buyerName: string
  buyerPhone: string
  buyerComment: string | null
  quantity: number | string
  status: string
  createdAt: string
  updatedAt: string
}

export type AdminCategoryMapping = {
  id: string
  inventoryCategoryValue: string
  marketCategoryId: string
  marketCategoryName: string | null
}
