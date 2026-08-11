import { AssetExpensesSection } from '@/components/shared/AssetExpensesSection'

type EquipmentExpensesSectionProps = {
  equipmentId: string
  canManage: boolean
}

export function EquipmentExpensesSection({
  equipmentId,
  canManage,
}: EquipmentExpensesSectionProps) {
  return <AssetExpensesSection equipmentId={equipmentId} canManage={canManage} />
}
