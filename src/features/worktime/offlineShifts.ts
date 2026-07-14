import { format } from 'date-fns'
import type { Equipment, Location, Shift, WorkType } from '@/types'
import type { CurrentUser } from '@/lib/transformers'
import { db } from '@/lib/db'
import {
  shiftCloseToApi,
  shiftCreateToApi,
  type ShiftCloseInput,
  type ShiftCreateInput,
} from '@/lib/transformers'

export function buildLocalOpenShift(
  payload: ShiftCreateInput,
  user: CurrentUser | undefined,
  locations: Location[],
  workTypes: WorkType[],
  equipment: Equipment[],
  idempotencyKey: string,
): Shift {
  const now = new Date()
  const locationName =
    locations.find((item) => item.id === payload.locationId)?.name ?? payload.locationId
  const workTypeName =
    workTypes.find((item) => item.id === payload.workTypeId)?.name ?? payload.workTypeId
  const equipmentName = payload.equipmentId
    ? (equipment.find((item) => item.id === payload.equipmentId)?.name ?? '')
    : ''

  return {
    id: idempotencyKey,
    date: format(now, 'dd.MM.yyyy'),
    startTime: format(now, 'HH:mm:ss'),
    endTime: null,
    employeeId: payload.employeeId ?? user?.id,
    employeeCode: user?.employeeCode ?? '',
    employeeName: user?.fullName ?? '',
    telegramId: '',
    location: locationName,
    workType: workTypeName,
    equipment: equipmentName,
    description: '',
    comment: '',
    status: 'open',
    durationRaw: null,
    durationRounded: null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    _isLocal: true,
  }
}

export async function enqueueCreateShiftOffline(
  payload: ShiftCreateInput,
  user: CurrentUser | undefined,
  locations: Location[],
  workTypes: WorkType[],
  equipment: Equipment[],
): Promise<Shift> {
  const idempotencyKey = crypto.randomUUID()
  const body = shiftCreateToApi(payload)
  const resolvedLocations = locations.length > 0 ? locations : await db.locations.toArray()
  const resolvedWorkTypes = workTypes.length > 0 ? workTypes : await db.workTypes.toArray()
  const resolvedEquipment = equipment.length > 0 ? equipment : await db.equipment.toArray()
  const localShift = buildLocalOpenShift(
    payload,
    user,
    resolvedLocations,
    resolvedWorkTypes,
    resolvedEquipment,
    idempotencyKey,
  )

  await db.shifts.add(localShift)
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    method: 'POST',
    url: '/api/shifts',
    body,
    idempotencyKey,
    createdAt: Date.now(),
    retries: 0,
    status: 'pending',
  })

  return localShift
}

export async function enqueueCloseShiftOffline(
  id: string,
  payload: ShiftCloseInput,
): Promise<Shift | null> {
  const idempotencyKey = crypto.randomUUID()
  const body = shiftCloseToApi(payload)
  const existing = await db.shifts.get(id)
  const now = new Date()

  if (existing) {
    await db.shifts.put({
      ...existing,
      endTime: format(now, 'HH:mm:ss'),
      description: payload.description,
      comment: payload.comment ?? '',
      status: 'closed',
    })
  }

  await db.syncQueue.add({
    id: crypto.randomUUID(),
    method: 'POST',
    url: `/api/shifts/${id}/close`,
    body,
    idempotencyKey,
    createdAt: Date.now(),
    retries: 0,
    status: 'pending',
  })

  return existing ?? null
}
