import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Shift, ShiftFilters } from '@/types'
import { api } from '@/lib/api'
import { db } from '@/lib/db'

function parseShiftDate(date: string): Date {
  const [day, month, year] = date.split('.').map(Number)
  return new Date(year, month - 1, day)
}

function buildShiftParams(filters: ShiftFilters) {
  return {
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.employeeId ? { employeeCode: filters.employeeId } : {}),
    ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
  }
}

async function getShiftsFromDexie(filters: ShiftFilters): Promise<Shift[]> {
  let shifts = await db.shifts.toArray()

  if (filters.from) {
    const from = parseShiftDate(filters.from)
    shifts = shifts.filter((shift) => parseShiftDate(shift.date) >= from)
  }

  if (filters.to) {
    const to = parseShiftDate(filters.to)
    shifts = shifts.filter((shift) => parseShiftDate(shift.date) <= to)
  }

  if (filters.employeeId) {
    shifts = shifts.filter(
      (shift) =>
        shift.employeeCode === filters.employeeId || shift.id === filters.employeeId,
    )
  }

  if (filters.status && filters.status !== 'all') {
    shifts = shifts.filter((shift) => shift.status === filters.status)
  }

  return shifts
}

async function fetchShifts(filters: ShiftFilters): Promise<Shift[]> {
  if (!navigator.onLine) {
    return getShiftsFromDexie(filters)
  }

  const { data } = await api.get<Shift[]>('/api/shifts', {
    params: buildShiftParams(filters),
  })
  return data
}

async function fetchShift(id: string): Promise<Shift> {
  if (!navigator.onLine) {
    const shift = await db.shifts.get(id)
    if (!shift) {
      throw new Error('Смена не найдена')
    }
    return shift
  }

  const { data } = await api.get<Shift>(`/api/shifts/${id}`)
  return data
}

export function useShifts(filters: ShiftFilters) {
  return useQuery({
    queryKey: ['shifts', filters],
    queryFn: () => fetchShifts(filters),
    placeholderData: undefined,
  })
}

export function useShift(id: string) {
  return useQuery({
    queryKey: ['shifts', id],
    queryFn: () => fetchShift(id),
    enabled: Boolean(id),
  })
}

export function useCreateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Partial<Shift>) => {
      const { data } = await api.post<Shift>('/api/shifts', payload)
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}

export function useCloseShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<Shift>) => {
      const { data } = await api.patch<Shift>(`/api/shifts/${id}`, payload)
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Смена закрыта')
    },
    onError: () => toast.error('Не удалось закрыть смену'),
  })
}

export function useDeleteShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/shifts/${id}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}
