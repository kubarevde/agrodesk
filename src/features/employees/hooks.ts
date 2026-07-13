import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Employee, Shift } from '@/types'
import { api } from '@/lib/api'
import { db } from '@/lib/db'
import { calcTotalHours, getDefaultMonthRange } from '@/features/worktime/utils'
import type { EmployeeFormValues } from './schemas'

async function fetchEmployees(): Promise<Employee[]> {
  if (!navigator.onLine) {
    return db.employees.toArray()
  }

  const { data } = await api.get<Employee[]>('/api/employees')
  return data
}

export function useEmployeesList() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
  })
}

export function useEmployeeMonthHours(employeeCode?: string) {
  const { from, to } = getDefaultMonthRange()

  return useQuery({
    queryKey: ['employees', employeeCode, 'month-hours', from, to],
    queryFn: async () => {
      const { data } = await api.get<Shift[]>('/api/shifts', {
        params: { from, to, employeeCode },
      })
      const shifts = Array.isArray(data) ? data : []
      return calcTotalHours(shifts.filter((shift) => shift.employeeCode === employeeCode))
    },
    enabled: Boolean(employeeCode),
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: EmployeeFormValues) => {
      const { data } = await api.post<Employee>('/api/employees', {
        ...payload,
        telegramId: payload.telegramId?.trim() ?? '',
      })
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Сотрудник добавлен')
    },
    onError: () => toast.error('Не удалось добавить сотрудника'),
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & EmployeeFormValues) => {
      const { data } = await api.patch<Employee>(`/api/employees/${id}`, {
        ...payload,
        telegramId: payload.telegramId?.trim() ?? '',
      })
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Данные сотрудника обновлены')
    },
    onError: () => toast.error('Не удалось обновить сотрудника'),
  })
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<Employee>(`/api/employees/${id}`, { isActive: false })
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Сотрудник деактивирован')
    },
    onError: () => toast.error('Не удалось деактивировать сотрудника'),
  })
}
