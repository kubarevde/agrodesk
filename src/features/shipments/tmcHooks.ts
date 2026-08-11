import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { TmcShipment, TmcShipmentFilters } from '@/types'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import {
  tmcShipmentCreateToApi,
  tmcShipmentFiltersToApi,
  tmcShipmentFromApi,
  tmcShipmentUpdateToApi,
} from '@/lib/transformers'
import type { TmcShipmentFormValues } from './tmcSchemas'

async function invalidateTmcShipmentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['tmc-shipments'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ])
}

export function useTmcShipments(filters: TmcShipmentFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['tmc-shipments', filters],
    enabled,
    queryFn: async (): Promise<TmcShipment[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/tmc-shipments', {
        params: tmcShipmentFiltersToApi(filters),
      })
      return data.map(tmcShipmentFromApi)
    },
  })
}

export function useCreateTmcShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TmcShipmentFormValues) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/tmc-shipments',
        tmcShipmentCreateToApi({
          date: payload.date,
          inventoryItemId: payload.inventoryItemId,
          quantity: payload.quantity,
          destination: payload.destination,
          pricePerUnit: payload.pricePerUnit,
          notes: payload.notes,
          shipmentRequestId:
            payload.shipmentRequestId && payload.shipmentRequestId !== 'none'
              ? payload.shipmentRequestId
              : '',
        }),
      )
      return tmcShipmentFromApi(data)
    },
    onSuccess: async () => {
      await invalidateTmcShipmentQueries(queryClient)
      toast.success('Отгрузка ТМЦ добавлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить отгрузку ТМЦ')),
  })
}

export function useUpdateTmcShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & TmcShipmentFormValues) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/tmc-shipments/${id}`,
        tmcShipmentUpdateToApi({
          date: payload.date,
          inventoryItemId: payload.inventoryItemId,
          quantity: payload.quantity,
          destination: payload.destination,
          pricePerUnit: payload.pricePerUnit,
          notes: payload.notes,
          shipmentRequestId:
            payload.shipmentRequestId && payload.shipmentRequestId !== 'none'
              ? payload.shipmentRequestId
              : '',
        }),
      )
      return tmcShipmentFromApi(data)
    },
    onSuccess: async () => {
      await invalidateTmcShipmentQueries(queryClient)
      toast.success('Отгрузка ТМЦ обновлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить отгрузку ТМЦ')),
  })
}

export function useDeleteTmcShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/tmc-shipments/${id}`)
    },
    onSuccess: async () => {
      await invalidateTmcShipmentQueries(queryClient)
      toast.success('Отгрузка ТМЦ удалена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить отгрузку ТМЦ')),
  })
}
