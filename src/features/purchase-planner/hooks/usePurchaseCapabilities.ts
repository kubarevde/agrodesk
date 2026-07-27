import { useCurrentUser } from '@/features/auth/hooks'

export function usePurchaseCapabilities() {
  const { data: user } = useCurrentUser()
  const isManager = user?.role === 'admin' || user?.role === 'manager'

  return {
    isManager,
    canManage: isManager,
    canCreate: true,
    canMarkPurchased: true,
    canCreateExpense: isManager,
    canDelete: isManager,
    canCancel: isManager,
    canRevert: isManager,
    canEdit: isManager,
    showManageMode: isManager,
  }
}
