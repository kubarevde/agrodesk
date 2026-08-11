import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import {
  advanceCreateToApi,
  payoutCreateToApi,
  payoutFromApi,
  runSummaryFromApi,
  sheetFromApi,
} from './api'
import type { CreateAdvancePayload, CreatePayoutPayload } from './types'

const runsKey = ['payroll-runs'] as const
const sheetKey = (runId: string) => ['payroll-payout-sheet', runId] as const
const unlinkedKey = (runId: string) => ['payroll-unlinked-advances', runId] as const

export function usePayrollRunsForPayout() {
  return useQuery({
    // Separate key from accruals list — filtering confirmed/paid must not poison
    // the shared ['payroll-runs'] cache (that hid draft runs in «Начисления»).
    queryKey: [...runsKey, 'for-payout'] as const,
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/payroll-runs')
      return (Array.isArray(data) ? data : [])
        .map(runSummaryFromApi)
        .filter((r) => r.status === 'confirmed' || r.status === 'paid')
    },
  })
}

export function usePayoutSheet(runId: string | null) {
  return useQuery({
    queryKey: sheetKey(runId ?? ''),
    enabled: Boolean(runId),
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>>(
        `/api/payroll-runs/${runId}/payout-sheet`,
      )
      return sheetFromApi(data)
    },
  })
}

export function useUnlinkedAdvances(runId: string | null, enabled = true) {
  return useQuery({
    queryKey: unlinkedKey(runId ?? ''),
    enabled: Boolean(runId) && enabled,
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/payroll-payouts/unlinked', {
        params: { run_id: runId },
      })
      return (Array.isArray(data) ? data : []).map(payoutFromApi)
    },
  })
}

export function useCreateLinePayout(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      lineId,
      payload,
    }: {
      lineId: string
      payload: CreatePayoutPayload
    }) => {
      const { data } = await api.post<Record<string, unknown>>(
        `/api/payroll-runs/${runId}/lines/${lineId}/payouts`,
        payoutCreateToApi(payload),
      )
      return payoutFromApi(data)
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: sheetKey(runId) }),
        qc.invalidateQueries({ queryKey: runsKey }),
      ])
      toast.success('Выдача зафиксирована')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось зафиксировать выдачу')),
  })
}

export function useCloseRemainder(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lineId, comment }: { lineId: string; comment: string }) => {
      await api.post(`/api/payroll-runs/${runId}/lines/${lineId}/close-remainder`, {
        comment,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: sheetKey(runId) }),
        qc.invalidateQueries({ queryKey: runsKey }),
      ])
      toast.success('Остаток закрыт')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось закрыть остаток')),
  })
}

export function useCreateAdvance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateAdvancePayload) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/payroll-payouts/advances',
        advanceCreateToApi(payload),
      )
      return payoutFromApi(data)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['payroll-unlinked-advances'] })
      toast.success('Аванс зарегистрирован')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось зарегистрировать аванс')),
  })
}

export function useLinkAdvance(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      payoutId,
      lineId,
    }: {
      payoutId: string
      lineId: string
    }) => {
      const { data } = await api.post<Record<string, unknown>>(
        `/api/payroll-payouts/${payoutId}/link`,
        { payroll_run_line_id: lineId },
      )
      return payoutFromApi(data)
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: sheetKey(runId) }),
        qc.invalidateQueries({ queryKey: unlinkedKey(runId) }),
        qc.invalidateQueries({ queryKey: runsKey }),
      ])
      toast.success('Аванс привязан к строке')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось привязать аванс')),
  })
}
