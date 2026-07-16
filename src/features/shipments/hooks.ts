import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Shipment, ShipmentFilters } from '@/types'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import {
  shipmentCreateToApi,
  shipmentFiltersToApi,
  shipmentFromApi,
  shipmentUpdateToApi,
} from '@/lib/transformers'
import type { ShipmentFormValues } from './schemas'

async function invalidateShipmentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['shipments'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ])
}

export function useShipments(filters: ShipmentFilters = {}) {
  return useQuery({
    queryKey: ['shipments', filters],
    queryFn: async (): Promise<Shipment[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/shipments', {
        params: shipmentFiltersToApi(filters),
      })
      return data.map(shipmentFromApi)
    },
  })
}

export function useCreateShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ShipmentFormValues) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/shipments',
        shipmentCreateToApi(payload),
      )
      return shipmentFromApi(data)
    },
    onSuccess: async () => {
      await invalidateShipmentQueries(queryClient)
      toast.success('Отгрузка добавлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить отгрузку')),
  })
}

export function useUpdateShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & ShipmentFormValues) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/shipments/${id}`,
        shipmentUpdateToApi(payload),
      )
      return shipmentFromApi(data)
    },
    onSuccess: async () => {
      await invalidateShipmentQueries(queryClient)
      toast.success('Отгрузка обновлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить отгрузку')),
  })
}

export function useDeleteShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/shipments/${id}`)
    },
    onSuccess: async () => {
      await invalidateShipmentQueries(queryClient)
      toast.success('Отгрузка удалена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить отгрузку')),
  })
}
