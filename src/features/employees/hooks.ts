import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Employee, Shift } from '@/types'
import { api } from '@/lib/api'
import { db } from '@/lib/db'
import {
  employeeCreateToApi,
  employeeFromApi,
  employeeUpdateToApi,
  shiftFiltersToApi,
  shiftFromApi,
} from '@/lib/transformers'
import { calcTotalHours, getDefaultMonthRange, parseApiDate } from '@/features/worktime/utils'
import type { EmployeeFormValues } from './schemas'

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<Employee[]> => {
      if (!navigator.onLine) {
        return db.employees.toArray()
      }

      const { data } = await api.get<Record<string, unknown>[]>('/api/employees')
      const employees = data.map(employeeFromApi)
      await db.employees.clear()
      await db.employees.bulkPut(employees)
      return employees
    },
  })
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: async (): Promise<Employee> => {
      const { data } = await api.get<Record<string, unknown>>(`/api/employees/${id}`)
      return employeeFromApi(data)
    },
    enabled: Boolean(id),
  })
}

export interface EmployeeMonthStats {
  shiftsCount: number
  totalHours: number
  recentShifts: Shift[]
}

export function useEmployeeMonthStats(employeeId: string | undefined) {
  const { from, to } = getDefaultMonthRange()

  return useQuery({
    queryKey: ['employees', employeeId, 'month-stats', from, to],
    queryFn: async (): Promise<EmployeeMonthStats> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/shifts', {
        params: shiftFiltersToApi({ from, to, employeeId }),
      })
      const shifts = data
        .map(shiftFromApi)
        .sort((a, b) => parseApiDate(b.date).getTime() - parseApiDate(a.date).getTime())

      return {
        shiftsCount: shifts.length,
        totalHours: calcTotalHours(shifts.filter((shift) => shift.status === 'closed')),
        recentShifts: shifts.slice(0, 5),
      }
    },
    enabled: Boolean(employeeId),
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: EmployeeFormValues) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/employees',
        employeeCreateToApi({
          employeeCode: payload.employeeCode,
          employeeName: payload.employeeName,
          position: payload.position,
          hourlyRate: payload.hourlyRate,
          role: payload.role,
          password: payload.password,
        }),
      )
      return employeeFromApi(data)
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
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string
    } & Partial<EmployeeFormValues> & { isActive?: boolean }) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/employees/${id}`,
        employeeUpdateToApi({
          employeeName: payload.employeeName,
          position: payload.position,
          hourlyRate: payload.hourlyRate,
          role: payload.role,
          password: payload.password || undefined,
          isActive: payload.isActive,
        }),
      )
      return employeeFromApi(data)
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      if (variables.isActive === false) {
        toast.success('Сотрудник деактивирован')
      } else if (variables.isActive === true) {
        toast.success('Сотрудник активирован')
      } else {
        toast.success('Данные сотрудника обновлены')
      }
    },
    onError: () => toast.error('Не удалось обновить сотрудника'),
  })
}
