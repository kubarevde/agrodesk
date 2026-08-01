import { useQuery } from '@tanstack/react-query'
import {
  fetchPublicCategories,
  fetchPublicListing,
  fetchPublicListings,
  fetchPublicSeller,
} from './api'

export const marketPublicKeys = {
  listings: (params: {
    categoryId: string | null
    q: string
    page: number
  }) => ['marketplace-public', 'listings', params] as const,
  listing: (id: string) => ['marketplace-public', 'listing', id] as const,
  categories: ['marketplace-public', 'categories'] as const,
  seller: (id: string) => ['marketplace-public', 'seller', id] as const,
}

export function usePublicListings(params: {
  categoryId: string | null
  q: string
  page: number
}) {
  return useQuery({
    queryKey: marketPublicKeys.listings(params),
    queryFn: () =>
      fetchPublicListings({
        categoryId: params.categoryId,
        q: params.q,
        page: params.page,
        pageSize: 24,
      }),
  })
}

export function usePublicListing(id: string) {
  return useQuery({
    queryKey: marketPublicKeys.listing(id),
    queryFn: () => fetchPublicListing(id),
    enabled: Boolean(id),
  })
}

export function usePublicCategories() {
  return useQuery({
    queryKey: marketPublicKeys.categories,
    queryFn: fetchPublicCategories,
  })
}

export function usePublicSeller(id: string) {
  return useQuery({
    queryKey: marketPublicKeys.seller(id),
    queryFn: () => fetchPublicSeller(id),
    enabled: Boolean(id),
  })
}
