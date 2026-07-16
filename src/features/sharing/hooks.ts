import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { SharingListing } from '@/types'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { db } from '@/lib/db'
import { displayDateToIso } from '@/lib/transformers'
import {
  listingCreateToApi,
  listingFromApi,
  listingUpdateToApi,
  listingsFiltersToApi,
  requestCreateToApi,
  requestFromApi,
} from './api'
import type {
  SharingListingFormInput,
  SharingListingStatus,
  SharingListingUpdateInput,
  SharingListingsFilters,
  SharingRequestCreateInput,
  SharingRequestStatus,
} from './types'

async function invalidateSharing(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['sharing'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  ])
}

export function useSharingListings(filters: SharingListingsFilters = {}) {
  return useQuery({
    queryKey: ['sharing', 'listings', filters],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.sharingListings.toArray()
        return cached.filter((item) => {
          if (filters.type && item.type !== filters.type) return false
          if (filters.status && item.status !== filters.status) return false
          if (filters.region && item.region !== filters.region) return false
          return item.status === 'active'
        }) as SharingListing[]
      }

      const { data } = await api.get<Record<string, unknown>[]>('/api/sharing/listings', {
        params: listingsFiltersToApi({ status: 'active', ...filters }),
      })
      const listings = data.map(listingFromApi)
      await db.sharingListings.bulkPut(listings)
      return listings
    },
  })
}

export function useMySharingListings(status?: SharingListingStatus) {
  return useQuery({
    queryKey: ['sharing', 'listings', 'my', status ?? 'all'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/sharing/listings/my', {
        params: status ? { status } : undefined,
      })
      return data.map(listingFromApi)
    },
  })
}

export const useMyListings = useMySharingListings

export function useOutgoingSharingRequests() {
  return useQuery({
    queryKey: ['sharing', 'requests', 'outgoing'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>(
        '/api/sharing/requests/outgoing',
      )
      return data.map(requestFromApi)
    },
  })
}

export function useIncomingSharingRequests() {
  return useQuery({
    queryKey: ['sharing', 'requests', 'incoming'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>(
        '/api/sharing/requests/incoming',
      )
      return data.map(requestFromApi)
    },
  })
}

export const useOutgoingRequests = useOutgoingSharingRequests
export const useIncomingRequests = useIncomingSharingRequests

export function useCreateSharingRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SharingRequestCreateInput) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/sharing/requests',
        requestCreateToApi({
          ...input,
          desiredFrom: input.desiredFrom
            ? displayDateToIso(input.desiredFrom)
            : undefined,
          desiredTo: input.desiredTo ? displayDateToIso(input.desiredTo) : undefined,
        }),
      )
      return requestFromApi(data)
    },
    onSuccess: async () => {
      await invalidateSharing(queryClient)
      toast.success('Заявка отправлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось отправить заявку')),
  })
}

export function useCreateSharingListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SharingListingFormInput) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/sharing/listings',
        listingCreateToApi(input),
      )
      return listingFromApi(data)
    },
    onSuccess: async () => {
      await invalidateSharing(queryClient)
      toast.success('Объявление размещено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось создать объявление')),
  })
}

export function useUpdateSharingListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: SharingListingUpdateInput & { id: string }) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/sharing/listings/${id}`,
        listingUpdateToApi(input),
      )
      return listingFromApi(data)
    },
    onSuccess: async () => {
      await invalidateSharing(queryClient)
      toast.success('Объявление обновлено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить объявление')),
  })
}

export function useUpdateSharingListingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: SharingListingStatus
    }) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/sharing/listings/${id}/status`,
        { status },
      )
      return listingFromApi(data)
    },
    onSuccess: async () => {
      await invalidateSharing(queryClient)
      toast.success('Статус обновлён')
    },
    onError: () => toast.error('Не удалось изменить статус'),
  })
}

export function useDeleteSharingListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/sharing/listings/${id}`)
    },
    onSuccess: async () => {
      await invalidateSharing(queryClient)
      toast.success('Объявление удалено')
    },
    onError: () => toast.error('Не удалось удалить объявление'),
  })
}

export function useUpdateSharingRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      ownerResponse,
    }: {
      id: string
      status: Extract<SharingRequestStatus, 'accepted' | 'rejected' | 'done'>
      ownerResponse?: string
    }) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/sharing/requests/${id}`,
        {
          status,
          owner_response: ownerResponse || undefined,
        },
      )
      return requestFromApi(data)
    },
    onSuccess: async (_data, variables) => {
      await invalidateSharing(queryClient)
      toast.success(
        variables.status === 'accepted'
          ? 'Заявка принята'
          : variables.status === 'rejected'
            ? 'Заявка отклонена'
            : 'Статус заявки обновлён',
      )
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить заявку')),
  })
}
