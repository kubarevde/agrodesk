import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { toNumber } from '@/lib/transformers'
import type { EmployeeRateFormValues } from './schemas'
import type {
  EmployeeEarnings,
  EmployeeRate,
  SalaryPreview,
} from './types'

type ApiRecord = Record<string, unknown>

function employeeRateFromApi(raw: ApiRecord): EmployeeRate {
  return {
    id: String(raw.id),
    employeeId: String(raw.employee_id),
    employeeName: String(raw.employee_name ?? ''),
    workTypeId: raw.work_type_id != null ? String(raw.work_type_id) : null,
    workTypeName: raw.work_type_name != null ? String(raw.work_type_name) : null,
    rate: toNumber(raw.rate),
    overtimeMultiplier: toNumber(raw.overtime_multiplier),
    overtimeThresholdHours: toNumber(raw.overtime_threshold_hours),
    validFrom: String(raw.valid_from),
    validTo: raw.valid_to != null ? String(raw.valid_to) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
  }
}

function salaryPreviewFromApi(raw: ApiRecord): SalaryPreview {
  const summary = Array.isArray(raw.summary)
    ? raw.summary.map((item) => {
        const row = item as ApiRecord
        return {
          employeeId: String(row.employeeId ?? row.employee_id),
          employeeName: String(row.employeeName ?? row.employee_name ?? ''),
          employeeCode: String(row.employeeCode ?? row.employee_code ?? ''),
          shiftsCount: toNumber(row.shiftsCount ?? row.shifts_count),
          hours: toNumber(row.hours),
          regularHours: toNumber(row.regularHours ?? row.regular_hours),
          overtimeHours: toNumber(row.overtimeHours ?? row.overtime_hours),
          amount: toNumber(row.amount),
        }
      })
    : []

  const shifts = Array.isArray(raw.shifts)
    ? raw.shifts.map((item) => {
        const row = item as ApiRecord
        return {
          date: String(row.date),
          employeeId: String(row.employeeId ?? row.employee_id),
          employeeName: String(row.employeeName ?? row.employee_name ?? ''),
          workType: String(row.workType ?? row.work_type ?? ''),
          hours: toNumber(row.hours),
          amount: toNumber(row.amount),
          source: String(row.source ?? ''),
        }
      })
    : []

  return {
    month: String(raw.month),
    from: String(raw.from),
    to: String(raw.to),
    summary,
    shifts,
    totalAmount: toNumber(raw.totalAmount ?? raw.total_amount),
  }
}

function earningsFromApi(raw: ApiRecord): EmployeeEarnings {
  const shifts = Array.isArray(raw.shifts)
    ? raw.shifts.map((item) => {
        const row = item as ApiRecord
        return {
          date: String(row.date),
          workType: String(row.workType ?? row.work_type ?? ''),
          hours: toNumber(row.hours),
          regularHours: toNumber(row.regularHours ?? row.regular_hours),
          overtimeHours: toNumber(row.overtimeHours ?? row.overtime_hours),
          amount: toNumber(row.amount),
          source: String(row.source ?? ''),
        }
      })
    : []

  return {
    month: String(raw.month),
    employeeId: String(raw.employeeId ?? raw.employee_id),
    employeeName: String(raw.employeeName ?? raw.employee_name ?? ''),
    shiftsCount: toNumber(raw.shiftsCount ?? raw.shifts_count),
    hours: toNumber(raw.hours),
    totalAmount: toNumber(raw.totalAmount ?? raw.total_amount),
    shifts,
  }
}

function rateFormToApi(employeeId: string, values: EmployeeRateFormValues) {
  return {
    employee_id: employeeId,
    work_type_id: values.workTypeId || null,
    rate: values.rate,
    overtime_threshold_hours: values.overtimeThresholdHours,
    overtime_multiplier: values.overtimeMultiplier,
    valid_from: values.validFrom,
    valid_to: values.validTo || null,
    notes: values.notes || null,
  }
}

export function useEmployeeRates(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-rates', employeeId],
    queryFn: async (): Promise<EmployeeRate[]> => {
      const { data } = await api.get<ApiRecord[]>('/api/employee-rates', {
        params: { employee_id: employeeId },
      })
      return data.map(employeeRateFromApi)
    },
    enabled: Boolean(employeeId),
  })
}

export function useAllEmployeeRates(enabled = true) {
  return useQuery({
    queryKey: ['employee-rates', 'all'],
    queryFn: async (): Promise<EmployeeRate[]> => {
      const { data } = await api.get<ApiRecord[]>('/api/employee-rates')
      return data.map(employeeRateFromApi)
    },
    enabled,
  })
}

export function useCreateEmployeeRate(employeeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: EmployeeRateFormValues) => {
      const { data } = await api.post<ApiRecord>(
        '/api/employee-rates',
        rateFormToApi(employeeId, values),
      )
      return employeeRateFromApi(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employee-rates'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Ставка добавлена')
    },
    onError: () => toast.error('Не удалось добавить ставку'),
  })
}

export function useUpdateEmployeeRate(employeeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: EmployeeRateFormValues
    }) => {
      const { data } = await api.patch<ApiRecord>(`/api/employee-rates/${id}`, {
        work_type_id: values.workTypeId || null,
        rate: values.rate,
        overtime_threshold_hours: values.overtimeThresholdHours,
        overtime_multiplier: values.overtimeMultiplier,
        valid_from: values.validFrom,
        valid_to: values.validTo || null,
        notes: values.notes || null,
      })
      return employeeRateFromApi(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employee-rates', employeeId] })
      await queryClient.invalidateQueries({ queryKey: ['employee-rates', 'all'] })
      toast.success('Ставка обновлена')
    },
    onError: () => toast.error('Не удалось обновить ставку'),
  })
}

export function useDeleteEmployeeRate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/employee-rates/${id}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employee-rates'] })
      toast.success('Ставка удалена')
    },
    onError: () => toast.error('Не удалось удалить ставку'),
  })
}

export function useLinkTelegram() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      telegramId,
    }: {
      employeeId: string
      telegramId: number
    }) => {
      const { data } = await api.patch<ApiRecord>(
        `/api/employees/${employeeId}/link-telegram`,
        { telegram_id: telegramId },
      )
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Telegram привязан')
    },
    onError: () => toast.error('Не удалось привязать Telegram'),
  })
}

export function useSalaryPreview(month: string, enabled: boolean) {
  return useQuery({
    queryKey: ['salary-preview', month],
    queryFn: async (): Promise<SalaryPreview> => {
      const { data } = await api.get<ApiRecord>('/api/reports/salary-preview', {
        params: { month },
      })
      return salaryPreviewFromApi(data)
    },
    enabled: enabled && Boolean(month),
  })
}

export function useMyEarnings(month: string) {
  return useQuery({
    queryKey: ['my-earnings', month],
    queryFn: async (): Promise<EmployeeEarnings> => {
      const { data } = await api.get<ApiRecord>('/api/employees/me/earnings', {
        params: { month },
      })
      return earningsFromApi(data)
    },
    enabled: Boolean(month),
  })
}
