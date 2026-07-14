import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Equipment, Location, Shift, ShiftFilters, WorkType } from '@/types'
import type { CurrentUser } from '@/lib/transformers'
import { api } from '@/lib/api'
import { db } from '@/lib/db'
import {
  shiftCloseToApi,
  shiftCreateToApi,
  shiftFiltersToApi,
  shiftFromApi,
  shiftManualAddToApi,
  shiftUpdateToApi,
  type ShiftCloseInput,
  type ShiftCreateInput,
  type ShiftManualAddInput,
  type ShiftUpdateInput,
} from '@/lib/transformers'
import { enqueueCloseShiftOffline, enqueueCreateShiftOffline } from './offlineShifts'
import { parseApiDate } from './utils'

async function getShiftsFromDexie(filters: ShiftFilters): Promise<Shift[]> {
  let shifts = await db.shifts.toArray()

  if (filters.from) {
    const from = parseApiDate(filters.from)
    shifts = shifts.filter((shift) => parseApiDate(shift.date) >= from)
  }

  if (filters.to) {
    const to = parseApiDate(filters.to)
    shifts = shifts.filter((shift) => parseApiDate(shift.date) <= to)
  }

  if (filters.employeeId) {
    shifts = shifts.filter(
      (shift) =>
        shift.employeeId === filters.employeeId ||
        shift.employeeCode === filters.employeeId,
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

  const { data } = await api.get<Record<string, unknown>[]>('/api/shifts', {
    params: shiftFiltersToApi(filters),
  })
  return data.map(shiftFromApi)
}

async function fetchShift(id: string): Promise<Shift> {
  if (!navigator.onLine) {
    const shift = await db.shifts.get(id)
    if (!shift) {
      throw new Error('Смена не найдена')
    }
    return shift
  }

  const { data } = await api.get<Record<string, unknown>>(`/api/shifts/${id}`)
  return shiftFromApi(data)
}

export function useShifts(filters: ShiftFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['shifts', filters],
    queryFn: () => fetchShifts(filters),
    placeholderData: undefined,
    enabled: options?.enabled ?? true,
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
    mutationFn: async (payload: ShiftCreateInput) => {
      if (!navigator.onLine) {
        const localShift = await enqueueCreateShiftOffline(
          payload,
          queryClient.getQueryData<CurrentUser>(['auth', 'me']),
          queryClient.getQueryData<Location[]>(['locations']) ?? [],
          queryClient.getQueryData<WorkType[]>(['work-types']) ?? [],
          queryClient.getQueryData<Equipment[]>(['equipment']) ?? [],
        )
        toast.info('💾 Сохранено офлайн')
        await queryClient.invalidateQueries({ queryKey: ['shifts'] })
        return { shift: localShift, offline: true as const }
      }

      const { data } = await api.post<Record<string, unknown>>(
        '/api/shifts',
        shiftCreateToApi(payload),
      )
      return { shift: shiftFromApi(data), offline: false as const }
    },
    onSuccess: async (result) => {
      if (result.offline) return
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}

export function useCloseShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & ShiftCloseInput) => {
      if (!navigator.onLine) {
        const existing = await enqueueCloseShiftOffline(id, payload)
        toast.info('💾 Сохранено офлайн')
        await queryClient.invalidateQueries({ queryKey: ['shifts'] })
        return { shift: existing, offline: true as const }
      }

      const { data } = await api.post<Record<string, unknown>>(
        `/api/shifts/${id}/close`,
        shiftCloseToApi(payload),
      )
      return { shift: shiftFromApi(data), offline: false as const }
    },
    onSuccess: async (result) => {
      if (result.offline) return
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
      const hours = result.shift.durationRounded ?? 0
      toast.success(`✅ Смена завершена — ${hours} ч`)
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Не удалось закрыть смену'
      toast.error(`Ошибка: ${message}`)
    },
  })
}

export function useManualAddShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ShiftManualAddInput) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/shifts/manual',
        shiftManualAddToApi(payload),
      )
      return shiftFromApi(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}

export function useUpdateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & ShiftUpdateInput) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/shifts/${id}`,
        shiftUpdateToApi(payload),
      )
      return shiftFromApi(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
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
