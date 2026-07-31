import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/apiError'
import {
  assignShipmentRequest,
  cancelShipmentRequest,
  completeShipmentRequest,
  createShipmentRequest,
  fetchShipmentRequest,
  fetchShipmentRequests,
  startShipmentRequest,
  updateShipmentRequest,
} from './api'
import type {
  ShipmentRequestCompletePayload,
  ShipmentRequestCreatePayload,
  ShipmentRequestFilters,
  ShipmentRequestUpdatePayload,
} from './types'

const QUERY_KEY = ['shipment-requests'] as const

export function useShipmentRequests(filters: ShipmentRequestFilters = {}, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: () => fetchShipmentRequests(filters),
    enabled,
  })
}

export function useShipmentRequest(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'detail', id],
    queryFn: async () => {
      if (!id) throw new Error('request id required')
      return fetchShipmentRequest(id)
    },
    enabled: Boolean(id) && enabled,
  })
}

/** Executor inbox — server filters to unassigned + mine. */
export function useMyShipmentRequests(enabled = true) {
  return useShipmentRequests({ mineOnly: true }, enabled)
}

export function useCreateShipmentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ShipmentRequestCreatePayload) => createShipmentRequest(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Заявка на отгрузку создана')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось создать заявку')),
  })
}

export function useUpdateShipmentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ShipmentRequestUpdatePayload }) =>
      updateShipmentRequest(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Заявка обновлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить заявку')),
  })
}

export function useAssignShipmentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string }) =>
      assignShipmentRequest(id, assignedTo),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Исполнитель назначен')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось назначить')),
  })
}

/** Alias per module API contract. */
export const useAssign = useAssignShipmentRequest

export function useStartShipmentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => startShipmentRequest(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Заявка взята в работу')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось начать')),
  })
}

export function useCompleteShipmentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload?: ShipmentRequestCompletePayload
    }) => completeShipmentRequest(id, payload),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: QUERY_KEY }),
        qc.invalidateQueries({ queryKey: ['inventory'] }),
      ])
      toast.success('Заявка выполнена — ТМЦ списаны')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось выполнить заявку')),
  })
}

/** Alias per module API contract. */
export const useComplete = useCompleteShipmentRequest

export function useCancelShipmentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelShipmentRequest(id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Заявка отменена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось отменить')),
  })
}

/** Alias per module API contract. */
export const useCancel = useCancelShipmentRequest
