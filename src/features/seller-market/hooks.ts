import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/apiError'
import * as api from './api'
import { parseImportFromSourceError } from './labels'

export const sellerMarketKeys = {
  profile: ['seller-market', 'profile'] as const,
  listings: (status?: string) => ['seller-market', 'listings', status ?? 'all'] as const,
  listing: (id: string) => ['seller-market', 'listing', id] as const,
  orders: (status?: string) => ['seller-market', 'orders', status ?? 'all'] as const,
  ordersReport: (from: string, to: string, status?: string) =>
    ['seller-market', 'orders-report', from, to, status ?? 'all'] as const,
  importSources: ['seller-market', 'import-sources'] as const,
  categories: ['seller-market', 'categories'] as const,
}

export function useSellerProfile(enabled = true) {
  return useQuery({
    queryKey: sellerMarketKeys.profile,
    queryFn: api.fetchSellerProfile,
    enabled,
  })
}

export function useUpdateSellerProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.updateSellerProfile,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: sellerMarketKeys.profile })
      toast.success('Профиль магазина сохранён')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось сохранить профиль')),
  })
}

export function useSellerListings(status?: string, enabled = true) {
  return useQuery({
    queryKey: sellerMarketKeys.listings(status),
    queryFn: () => api.fetchSellerListings(status),
    enabled,
  })
}

export function useSellerListing(id: string, enabled = true) {
  return useQuery({
    queryKey: sellerMarketKeys.listing(id),
    queryFn: () => api.fetchSellerListing(id),
    enabled: enabled && Boolean(id),
  })
}

export function useCreateSellerListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createSellerListing,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['seller-market', 'listings'] })
      toast.success('Черновик создан')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось создать объявление')),
  })
}

export function useUpdateSellerListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.updateSellerListing(id, payload),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['seller-market', 'listings'] }),
        qc.invalidateQueries({ queryKey: sellerMarketKeys.listing(vars.id) }),
      ])
      toast.success('Объявление сохранено')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось сохранить')),
  })
}

export function useSubmitSellerListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.submitSellerListing,
    onSuccess: async (data) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['seller-market', 'listings'] }),
        qc.invalidateQueries({ queryKey: sellerMarketKeys.listing(data.id) }),
      ])
      toast.success('Отправлено на модерацию')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не готово к модерации')),
  })
}

export function useArchiveSellerListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.archiveSellerListing,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['seller-market', 'listings'] })
      toast.success('Объявление в архиве')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось архивировать')),
  })
}

export function useImportSources(enabled = true) {
  return useQuery({
    queryKey: sellerMarketKeys.importSources,
    queryFn: api.fetchImportSources,
    enabled,
  })
}

export function useImportFromSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.importListingFromSource,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['seller-market', 'listings'] })
      await qc.invalidateQueries({ queryKey: sellerMarketKeys.importSources })
      toast.success(
        'Черновик создан. Количество будет синхронизироваться со складом; склад не изменён.',
      )
    },
    onError: (e) => {
      const info = parseImportFromSourceError(e)
      toast.error(info.message)
    },
  })
}

export function useSellerOrders(status?: string, enabled = true) {
  return useQuery({
    queryKey: sellerMarketKeys.orders(status),
    queryFn: () => api.fetchSellerOrders(status),
    enabled,
  })
}

export function useOrdersReport(
  params: { from_date: string; to_date: string; status?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: sellerMarketKeys.ordersReport(
      params.from_date,
      params.to_date,
      params.status,
    ),
    queryFn: () => api.fetchOrdersReport(params),
    enabled: enabled && Boolean(params.from_date && params.to_date),
  })
}

export function useExportOrdersReport() {
  return useMutation({
    mutationFn: api.downloadOrdersReportExcel,
    onSuccess: () => toast.success('Excel заявок витрины скачан'),
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось скачать отчёт')),
  })
}

export function useUpdateSellerOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateSellerOrderStatus(id, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['seller-market', 'orders'] })
      await qc.invalidateQueries({ queryKey: ['seller-market', 'orders-report'] })
      toast.success('Статус заявки обновлён')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Не удалось сменить статус')),
  })
}

export function useMarketCategories(enabled = true) {
  return useQuery({
    queryKey: sellerMarketKeys.categories,
    queryFn: api.fetchMarketCategories,
    enabled,
  })
}
