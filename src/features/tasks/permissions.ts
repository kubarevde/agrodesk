import { useMemo } from 'react'
import type { CurrentUser } from '@/lib/transformers'
import { hasAction } from '@/lib/permissionActions'
import type { OrgTask } from './types'

type Perms = { actions?: string[] } | null | undefined

export function useTaskPermissions(user: CurrentUser | null | undefined, perms: Perms) {
  const role = user?.role
  const actions = perms?.actions
  return useMemo(
    () => ({
      canCreate: hasAction(actions, 'tasks.create', role),
      canManage: hasAction(actions, 'tasks.manage', role),
      canViewAll: hasAction(actions, 'tasks.view_all', role),
      canCompleteOwn: hasAction(actions, 'tasks.complete_own', role),
      canCompleteGeneral: hasAction(actions, 'tasks.complete_general', role),
    }),
    [actions, role],
  )
}

export function canCompleteTaskUi(
  task: OrgTask,
  userId: string | undefined,
  rights: ReturnType<typeof useTaskPermissions>,
): boolean {
  if (task.status !== 'active') return false
  if (rights.canManage) return true
  if (task.visibilityType === 'specific_employee' && task.assigneeId === userId) {
    return rights.canCompleteOwn
  }
  if (task.visibilityType === 'all_employees') return rights.canCompleteGeneral
  return false
}
