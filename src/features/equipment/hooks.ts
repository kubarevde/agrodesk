import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { EquipmentExtended } from '@/types'
import { api } from '@/lib/api'
import { db } from '@/lib/db'
import type { ImplementResponse } from '@/features/implements/types'
import type {
  EquipmentFormValues,
  MaintenanceFormValues,
  MeterLogFormValues,
} from './schemas'
import type { EquipmentDetail, MaintenanceResponse, MeterLogResponse } from './types'
import { toIsoDate } from './types'

type EquipmentFilters = {
  is_active?: boolean
}

function toPayload(values: EquipmentFormValues) {
  const clean = (n: number | undefined) =>
    n == null || Number.isNaN(n) ? null : n

  return {
    name: values.name,
    type: values.type ?? null,
    year_of_manufacture: clean(values.year_of_manufacture),
    serial_number: values.serial_number || null,
    meter_type: values.meter_type,
    current_meter: values.current_meter ?? 0,
    to_interval: clean(values.to_interval),
    latitude: clean(values.latitude),
    longitude: clean(values.longitude),
    image_url: values.image_url || null,
  }
}

export function useEquipment(filters?: EquipmentFilters) {
  return useQuery({
    queryKey: ['equipment', filters ?? {}],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.equipment.toArray()
        if (filters?.is_active === false) return cached
        return cached.filter((item) => item.is_active)
      }

      const { data } = await api.get<EquipmentDetail[]>('/api/equipment', {
        params: filters,
      })
      await db.equipment.bulkPut(data)
      return data
    },
  })
}

export function useEquipmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['equipment', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!navigator.onLine && id) {
        const cached = await db.equipment.get(id)
        if (cached) return cached as EquipmentDetail
      }

      const { data } = await api.get<EquipmentDetail>(`/api/equipment/${id}`)
      await db.equipment.put(data)
      return data
    },
  })
}

export function useCreateEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: EquipmentFormValues) => {
      const { data } = await api.post<EquipmentDetail>('/api/equipment', toPayload(values))
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Техника добавлена')
    },
    onError: () => toast.error('Не удалось добавить технику'),
  })
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: Partial<EquipmentFormValues> & { is_active?: boolean }
    }) => {
      const payload =
        values.name != null
          ? toPayload({
              name: values.name,
              type: values.type,
              year_of_manufacture: values.year_of_manufacture,
              serial_number: values.serial_number,
              meter_type: values.meter_type ?? 'motohours',
              current_meter: values.current_meter ?? 0,
              to_interval: values.to_interval,
              latitude: values.latitude,
              longitude: values.longitude,
              image_url: values.image_url,
            })
          : values
      const { data } = await api.patch<EquipmentDetail>(`/api/equipment/${id}`, payload)
      return data
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      if (variables.values.is_active === false) toast.success('Техника деактивирована')
      else toast.success('Техника обновлена')
    },
    onError: () => toast.error('Не удалось обновить технику'),
  })
}

export function useEquipmentMeterLogs(id: string | undefined) {
  return useQuery({
    queryKey: ['equipment', id, 'meter-logs'],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!navigator.onLine && id) {
        return db.equipmentMeterLogs.where({ equipment_id: id }).toArray()
      }

      const { data } = await api.get<MeterLogResponse[]>(`/api/equipment/${id}/meter-logs`)
      await db.transaction('rw', db.equipmentMeterLogs, async () => {
        await db.equipmentMeterLogs.where({ equipment_id: id }).delete()
        await db.equipmentMeterLogs.bulkPut(data)
      })
      return data
    },
  })
}

export function useEquipmentMaintenance(id: string | undefined) {
  return useQuery({
    queryKey: ['equipment', id, 'maintenance'],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<MaintenanceResponse[]>(`/api/equipment/${id}/maintenance`)
      return data
    },
  })
}

export function useAddMeterLog(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: MeterLogFormValues) => {
      const { data } = await api.post<MeterLogResponse>(`/api/equipment/${id}/meter-logs`, {
        value_added: values.value_added,
        date: toIsoDate(values.date),
        note: values.note || null,
      })
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Показание записано')
    },
    onError: () => toast.error('Не удалось записать показание'),
  })
}

export function useAddMaintenance(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: MaintenanceFormValues) => {
      const { data } = await api.post<MaintenanceResponse>(`/api/equipment/${id}/maintenance`, {
        date: toIsoDate(values.date),
        type: values.type,
        meter_at: values.meter_at,
        cost: values.cost,
        description: values.description || null,
        next_to_interval: values.next_to_interval,
      })
      return data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      ])
      toast.success('ТО записано')
    },
    onError: () => toast.error('Не удалось сохранить ТО'),
  })
}

export function useUpcomingMaintenance() {
  return useQuery({
    queryKey: ['equipment', 'maintenance', 'upcoming'],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.equipment.toArray()
        return cached.filter(
          (item) => item.to_status === 'warning' || item.to_status === 'overdue',
        ) as EquipmentExtended[] as EquipmentDetail[]
      }

      const { data } = await api.get<EquipmentDetail[]>('/api/equipment/maintenance/upcoming')
      await db.equipment.bulkPut(data)
      return data
    },
  })
}

export function useImplementsByEquipment(id: string | undefined) {
  return useQuery({
    queryKey: ['implements', 'by-equipment', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ImplementResponse[]>('/api/implements', {
        params: { equipment_id: id },
      })
      return data
    },
  })
}
