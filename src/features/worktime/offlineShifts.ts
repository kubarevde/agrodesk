import { format } from 'date-fns'
import type { Equipment, EquipmentExtended, Location, Shift, WorkType } from '@/types'
import type { CurrentUser } from '@/lib/transformers'
import { db } from '@/lib/db'
import { hasAction } from '@/lib/permissionActions'
import { readCachedUserPermissions } from '@/features/auth/storage'
import {
  shiftCloseToApi,
  shiftCreateToApi,
  type ShiftCloseInput,
  type ShiftCreateInput,
} from '@/lib/transformers'

export async function buildLocalOpenShift(
  payload: ShiftCreateInput,
  user: CurrentUser | undefined,
  locations: Location[],
  workTypes: WorkType[],
  equipment: Equipment[],
  idempotencyKey: string,
): Promise<Shift> {
  const now = new Date()
  const locationName =
    locations.find((item) => item.id === payload.locationId)?.name ?? payload.locationId
  const workTypeName =
    workTypes.find((item) => item.id === payload.workTypeId)?.name ?? payload.workTypeId
  const equipmentName = payload.equipmentId
    ? (equipment.find((item) => item.id === payload.equipmentId)?.name ?? '')
    : ''

  const targetId = payload.employeeId ?? user?.id
  let employeeCode = user?.employeeCode ?? ''
  let employeeName = user?.fullName ?? ''
  if (targetId && targetId !== user?.id) {
    const roster = await db.employees.get(targetId)
    if (roster) {
      employeeCode = roster.employeeCode || employeeCode
      employeeName = roster.employeeName || employeeName
    }
  }

  return {
    id: idempotencyKey,
    date: format(now, 'dd.MM.yyyy'),
    startTime: format(now, 'HH:mm:ss'),
    endTime: null,
    employeeId: targetId,
    employeeCode,
    employeeName,
    telegramId: '',
    location: locationName,
    workType: workTypeName,
    equipment: equipmentName,
    fieldId: payload.fieldId ?? null,
    implementId: payload.implementId ?? null,
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

function toReferenceEquipment(items: Array<Equipment | EquipmentExtended>): Equipment[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type ?? undefined,
    isActive: 'is_active' in item ? item.is_active : item.isActive,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
  }))
}

function resolveOfflineActions(
  actions: string[] | undefined,
  user: CurrentUser | undefined,
): string[] | undefined {
  if (actions != null) return actions
  if (!user?.role || !user.id) return undefined
  return readCachedUserPermissions(user.id, user.role)?.actions
}

export async function enqueueCreateShiftOffline(
  payload: ShiftCreateInput,
  user: CurrentUser | undefined,
  locations: Location[],
  workTypes: WorkType[],
  equipment: Equipment[],
  actions?: string[],
): Promise<Shift> {
  const openingForOther =
    Boolean(payload.employeeId) && payload.employeeId !== user?.id
  const resolvedActions = resolveOfflineActions(actions, user)
  if (resolvedActions == null && user?.role !== 'admin') {
    throw new Error(
      'Нет сохранённых прав для офлайн-открытия смены. Откройте приложение онлайн один раз.',
    )
  }
  const allowed = openingForOther
    ? hasAction(resolvedActions, 'shift.open_for_others', user?.role)
    : hasAction(resolvedActions, 'shift.open_own', user?.role)
  if (!allowed) {
    throw new Error('Недостаточно прав для открытия смены офлайн')
  }

  const idempotencyKey = crypto.randomUUID()
  const body = shiftCreateToApi(payload)
  const resolvedLocations = locations.length > 0 ? locations : await db.locations.toArray()
  const resolvedWorkTypes = workTypes.length > 0 ? workTypes : await db.workTypes.toArray()
  const resolvedEquipment = toReferenceEquipment(
    equipment.length > 0 ? equipment : await db.equipment.toArray(),
  )
  const localShift = await buildLocalOpenShift(
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
