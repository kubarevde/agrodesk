import { AssetMaintenanceHistorySection } from '@/components/shared/AssetMaintenanceHistorySection'
import { useEquipmentMaintenance } from '../hooks'

type EquipmentMaintenanceSectionProps = {
  equipmentId: string
  canManage: boolean
  onAdd: () => void
}

export function EquipmentMaintenanceSection({
  equipmentId,
  canManage,
  onAdd,
}: EquipmentMaintenanceSectionProps) {
  const { data: records = [], isLoading } = useEquipmentMaintenance(equipmentId)

  return (
    <AssetMaintenanceHistorySection
      records={records}
      isLoading={isLoading}
      canManage={canManage}
      onAdd={onAdd}
      showMeter
    />
  )
}
