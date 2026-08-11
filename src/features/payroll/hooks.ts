import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { payoutFromApi } from '@/features/payroll-payouts/api'
import type {
  AdjustmentType,
  PayrollAdjustment,
  PayrollRun,
  PayrollRunLine,
} from './types'

type ApiRecord = Record<string, unknown>

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function adjustmentFromApi(row: ApiRecord): PayrollAdjustment {
  return {
    id: String(row.id),
    payrollRunLineId: String(row.payroll_run_line_id),
    type: row.type as AdjustmentType,
    amount: num(row.amount),
    sign: Number(row.sign),
    comment: row.comment != null ? String(row.comment) : null,
    createdBy: row.created_by != null ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  }
}

function lineFromApi(row: ApiRecord): PayrollRunLine {
  const adjustments = Array.isArray(row.adjustments)
    ? (row.adjustments as ApiRecord[]).map(adjustmentFromApi)
    : []
  return {
    id: String(row.id),
    payrollRunId: String(row.payroll_run_id),
    employeeId: String(row.employee_id),
    employeeName: String(row.employee_name ?? ''),
    employeeCode: String(row.employee_code ?? ''),
    paymentScheme: row.payment_scheme as PayrollRunLine['paymentScheme'],
    baseCalculatedAmount: num(row.base_calculated_amount),
    adjustmentsTotal: num(row.adjustments_total),
    totalAmount: num(row.total_amount),
    sourceBreakdown:
      row.source_breakdown && typeof row.source_breakdown === 'object'
        ? (row.source_breakdown as Record<string, unknown>)
        : {},
    payoutStatus: row.payout_status as PayrollRunLine['payoutStatus'],
    amountPaid: num(row.amount_paid),
    amountAdvance: num(row.amount_advance),
    amountSalaryPaid: num(row.amount_salary_paid),
    remainderAmount: num(row.remainder_amount),
    remainderClosed: Boolean(row.remainder_closed),
    remainderCloseComment: row.remainder_close_comment
      ? String(row.remainder_close_comment)
      : null,
    paidExceedsAccrued: Boolean(row.paid_exceeds_accrued),
    adjustments,
  }
}

function optionalIso(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s || s === 'undefined' || s === 'null' || s === 'None') return null
  return s
}

export function payrollRunFromApi(row: ApiRecord): PayrollRun {
  const lines = Array.isArray(row.lines) ? (row.lines as ApiRecord[]).map(lineFromApi) : []
  const totalPaid =
    num(row.total_paid) || lines.reduce((sum, line) => sum + line.amountPaid, 0)
  const totalAmount = num(row.total_amount) || lines.reduce((s, l) => s + l.totalAmount, 0)
  const remainder =
    row.remainder_amount != null
      ? num(row.remainder_amount)
      : Math.max(totalAmount - totalPaid, 0)
  const unlinked = Array.isArray(row.unlinked_advances)
    ? (row.unlinked_advances as ApiRecord[]).map(payoutFromApi)
    : []
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    periodStart: optionalIso(row.period_start) ?? '',
    periodEnd: optionalIso(row.period_end) ?? '',
    status: row.status as PayrollRun['status'],
    createdBy: row.created_by != null ? String(row.created_by) : null,
    createdAt: optionalIso(row.created_at) ?? '',
    confirmedBy: row.confirmed_by != null ? String(row.confirmed_by) : null,
    confirmedAt: optionalIso(row.confirmed_at),
    lines,
    linesCount: Number(row.lines_count ?? lines.length),
    totalAmount,
    totalPaid,
    remainderAmount: remainder,
    paidExceedsAccrued:
      Boolean(row.paid_exceeds_accrued) || lines.some((l) => l.paidExceedsAccrued),
    unlinkedAdvances: unlinked,
  }
}

const runsKey = ['payroll-runs'] as const

export function usePayrollRuns() {
  return useQuery({
    queryKey: runsKey,
    queryFn: async () => {
      const { data } = await api.get<ApiRecord[]>('/api/payroll-runs')
      return (Array.isArray(data) ? data : []).map(payrollRunFromApi)
    },
  })
}

export function usePayrollRun(runId: string | null) {
  return useQuery({
    queryKey: [...runsKey, runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      const { data } = await api.get<ApiRecord>(`/api/payroll-runs/${runId}`)
      return payrollRunFromApi(data)
    },
  })
}

async function invalidateRuns(qc: ReturnType<typeof useQueryClient>, runId?: string) {
  await qc.invalidateQueries({ queryKey: runsKey })
  if (runId) await qc.invalidateQueries({ queryKey: [...runsKey, runId] })
  await qc.invalidateQueries({ queryKey: ['payroll-payout-sheet'] })
}

export function useCreatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { periodStart: string; periodEnd: string }) => {
      const { data } = await api.post<ApiRecord>('/api/payroll-runs', {
        period_start: payload.periodStart,
        period_end: payload.periodEnd,
      })
      return payrollRunFromApi(data)
    },
    onSuccess: async (run) => {
      await invalidateRuns(qc, run.id)
      toast.success('Черновик начисления создан')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось создать начисление')),
  })
}

export function useConfirmPayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const { data } = await api.post<ApiRecord>(`/api/payroll-runs/${runId}/confirm`)
      return payrollRunFromApi(data)
    },
    onSuccess: async (run) => {
      await invalidateRuns(qc, run.id)
      toast.success('Начисление подтверждено, расходы созданы')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось подтвердить')),
  })
}

export function useUnconfirmPayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const { data } = await api.post<ApiRecord>(`/api/payroll-runs/${runId}/unconfirm`)
      return payrollRunFromApi(data)
    },
    onSuccess: async (run) => {
      await invalidateRuns(qc, run.id)
      toast.success('Подтверждение отменено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось отменить подтверждение')),
  })
}

export function useRecalculatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const { data } = await api.post<ApiRecord>(`/api/payroll-runs/${runId}/recalculate`)
      return payrollRunFromApi(data)
    },
    onSuccess: async (run) => {
      await invalidateRuns(qc, run.id)
      toast.success('Начисление пересчитано. Ручные корректировки сохранены')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось пересчитать')),
  })
}

export function useCreateAdjustment(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      lineId: string
      type: AdjustmentType
      amount: number
      sign?: 1 | -1
      comment?: string
    }) => {
      const body: Record<string, unknown> = {
        type: payload.type,
        amount: payload.amount,
        comment: payload.comment || null,
      }
      if (payload.type === 'other') body.sign = payload.sign
      const { data } = await api.post<ApiRecord>(
        `/api/payroll-runs/${runId}/lines/${payload.lineId}/adjustments`,
        body,
      )
      return adjustmentFromApi(data)
    },
    onSuccess: async () => {
      await invalidateRuns(qc, runId)
      toast.success('Корректировка добавлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить корректировку')),
  })
}

export function useDeleteAdjustment(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { lineId: string; adjustmentId: string }) => {
      await api.delete(
        `/api/payroll-runs/${runId}/lines/${payload.lineId}/adjustments/${payload.adjustmentId}`,
      )
    },
    onSuccess: async () => {
      await invalidateRuns(qc, runId)
      toast.success('Корректировка удалена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить корректировку')),
  })
}

export function useCreateRunAdvance(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string
      amountPaid: number
      payoutMethod: string
      payoutDate: string
      comment?: string
    }) => {
      const { data } = await api.post<ApiRecord>(`/api/payroll-runs/${runId}/advances`, {
        employee_id: payload.employeeId,
        amount_paid: payload.amountPaid,
        payout_method: payload.payoutMethod,
        payout_date: payload.payoutDate,
        comment: payload.comment || null,
      })
      return payoutFromApi(data)
    },
    onSuccess: async () => {
      await invalidateRuns(qc, runId)
      await qc.invalidateQueries({ queryKey: ['payroll-payout-sheet'] })
      toast.success('Аванс выдан и учтён в остатке к выдаче')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось выдать аванс')),
  })
}
