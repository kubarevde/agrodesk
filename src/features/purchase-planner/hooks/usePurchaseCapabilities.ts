import { useCurrentUser } from '@/features/auth/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { hasAction } from '@/lib/permissionActions'

export function usePurchaseCapabilities() {
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const role = user?.role
  const actions = perms?.actions

  const canManage = hasAction(actions, 'purchase.manage', role)
  const canCreate = hasAction(actions, 'purchase.create', role) || canManage

  return {
    isManager: canManage,
    canManage,
    canCreate,
    canMarkPurchased: canCreate,
    canCreateExpense: canManage,
    canDelete: canManage,
    canCancel: canManage,
    canRevert: canManage,
    canEdit: canManage,
    showManageMode: canManage,
  }
}
