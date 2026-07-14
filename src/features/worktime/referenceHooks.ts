import { useQuery } from '@tanstack/react-query'
import type { Employee, Equipment, Location, WorkType } from '@/types'
import { api } from '@/lib/api'
import { db } from '@/lib/db'
import {
  employeeFromApi,
  equipmentFromApi,
  locationFromApi,
  workTypeFromApi,
} from '@/lib/transformers'
import { useCurrentUser } from '@/features/auth/hooks'

const REFERENCE_STALE_TIME = Infinity

async function fetchLocations(): Promise<Location[]> {
  if (!navigator.onLine) {
    return db.locations.toArray()
  }

  const { data } = await api.get<Record<string, unknown>[]>('/api/locations', {
    params: { is_active: true },
  })
  const locations = data.map(locationFromApi)
  await db.locations.clear()
  await db.locations.bulkPut(locations)
  return locations
}

async function fetchWorkTypes(): Promise<WorkType[]> {
  if (!navigator.onLine) {
    return db.workTypes.toArray()
  }

  const { data } = await api.get<Record<string, unknown>[]>('/api/work-types', {
    params: { is_active: true },
  })
  const workTypes = data.map(workTypeFromApi)
  await db.workTypes.clear()
  await db.workTypes.bulkPut(workTypes)
  return workTypes
}

async function fetchEquipment(): Promise<Equipment[]> {
  if (!navigator.onLine) {
    const items = await db.equipment.toArray()
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type ?? undefined,
      isActive: item.is_active,
      latitude: item.latitude,
      longitude: item.longitude,
    }))
  }

  const { data } = await api.get<Record<string, unknown>[]>('/api/equipment', {
    params: { is_active: true },
  })
  return data.map(equipmentFromApi)
}

async function fetchEmployees(): Promise<Employee[]> {
  if (!navigator.onLine) {
    return db.employees.toArray()
  }

  const { data } = await api.get<Record<string, unknown>[]>('/api/employees', {
    params: { is_active: true },
  })
  const employees = data.map(employeeFromApi)
  await db.employees.clear()
  await db.employees.bulkPut(employees)
  return employees
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: REFERENCE_STALE_TIME,
  })
}

export function useWorkTypes() {
  return useQuery({
    queryKey: ['work-types'],
    queryFn: fetchWorkTypes,
    staleTime: REFERENCE_STALE_TIME,
  })
}

export function useEquipment() {
  return useQuery({
    queryKey: ['equipment'],
    queryFn: fetchEquipment,
    staleTime: REFERENCE_STALE_TIME,
  })
}

export function useEmployees() {
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  return useQuery({
    queryKey: ['employees', 'active'],
    queryFn: fetchEmployees,
    staleTime: REFERENCE_STALE_TIME,
    enabled: canManage,
  })
}
