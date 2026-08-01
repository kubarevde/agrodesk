import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/apiError'
import * as api from '../marketplaceApi'
import type { AdminCategoryCreate, AdminCategoryUpdate, AdminSellerUpdate } from '../marketplaceTypes'

export const marketplaceKeys = {
  listings: (status: string) => ['superadmin', 'marketplace', 'listings', status] as const,
  categories: ['superadmin', 'marketplace', 'categories'] as const,
  mappings: ['superadmin', 'marketplace', 'mappings'] as const,
  sellers: (orgId?: string) =>
    ['superadmin', 'marketplace', 'sellers', orgId ?? 'all'] as const,
  orders: (status?: string) =>
    ['superadmin', 'marketplace', 'orders', status ?? 'all'] as const,
}

export function useModerationListings(status = 'pending_review') {
  return useQuery({
    queryKey: marketplaceKeys.listings(status),
    queryFn: () => api.fetchModerationListings(status),
  })
}

export function useApproveListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.approveModerationListing(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['superadmin', 'marketplace', 'listings'] })
      toast.success('Объявление одобрено')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось одобрить')),
  })
}

export function useRejectListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.rejectModerationListing(id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['superadmin', 'marketplace', 'listings'] })
      toast.success('Объявление отклонено')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось отклонить')),
  })
}

export function useAdminCategories() {
  return useQuery({
    queryKey: marketplaceKeys.categories,
    queryFn: api.fetchAdminCategories,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminCategoryCreate) => api.createAdminCategory(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: marketplaceKeys.categories })
      toast.success('Категория создана')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось создать категорию')),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminCategoryUpdate }) =>
      api.updateAdminCategory(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: marketplaceKeys.categories })
      toast.success('Категория обновлена')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось обновить категорию')),
  })
}

export function useCategoryMappings() {
  return useQuery({
    queryKey: marketplaceKeys.mappings,
    queryFn: api.fetchCategoryMappings,
  })
}

export function useUpsertCategoryMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { inventoryCategoryValue: string; marketCategoryId: string }) =>
      api.upsertCategoryMapping(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: marketplaceKeys.mappings })
      toast.success('Маппинг сохранён')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось сохранить маппинг')),
  })
}

export function useDeleteCategoryMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCategoryMapping(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: marketplaceKeys.mappings })
      toast.success('Маппинг удалён')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось удалить маппинг')),
  })
}

export function useAdminSellers(orgId?: string) {
  return useQuery({
    queryKey: marketplaceKeys.sellers(orgId),
    queryFn: () => api.fetchAdminSellers(orgId),
  })
}

export function useUpdateSeller() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminSellerUpdate }) =>
      api.updateAdminSeller(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['superadmin', 'marketplace', 'sellers'] })
      toast.success('Продавец обновлён')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось обновить продавца')),
  })
}

export function useAdminOrders(status?: string) {
  return useQuery({
    queryKey: marketplaceKeys.orders(status),
    queryFn: () => api.fetchAdminOrders(status),
  })
}
