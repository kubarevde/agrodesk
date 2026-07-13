import { useQuery } from '@tanstack/react-query'
import type { Employee, Equipment, Location, WorkType } from '@/types'
import { api } from '@/lib/api'
import { db } from '@/lib/db'

const REFERENCE_STALE_TIME = Infinity

async function fetchLocations(): Promise<Location[]> {
  if (!navigator.onLine) {
    return db.locations.toArray()
  }

  const { data } = await api.get<Location[]>('/api/locations')
  return data
}

async function fetchWorkTypes(): Promise<WorkType[]> {
  if (!navigator.onLine) {
    return db.workTypes.toArray()
  }

  const { data } = await api.get<WorkType[]>('/api/work-types')
  return data
}

async function fetchEquipment(): Promise<Equipment[]> {
  if (!navigator.onLine) {
    return db.equipment.toArray()
  }

  const { data } = await api.get<Equipment[]>('/api/equipment')
  return data
}

async function fetchEmployees(): Promise<Employee[]> {
  if (!navigator.onLine) {
    return db.employees.toArray()
  }

  const { data } = await api.get<Employee[]>('/api/employees')
  return data
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
  return useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
    staleTime: REFERENCE_STALE_TIME,
  })
}
