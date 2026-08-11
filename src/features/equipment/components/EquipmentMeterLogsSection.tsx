import { AssetMeterLogsSection } from '@/components/shared/AssetMeterLogsSection'
import { useEquipmentMeterLogs } from '../hooks'

type EquipmentMeterLogsSectionProps = {
  equipmentId: string
  canManage: boolean
  onAdd: () => void
}

export function EquipmentMeterLogsSection({
  equipmentId,
  canManage,
  onAdd,
}: EquipmentMeterLogsSectionProps) {
  const { data: logs = [], isLoading } = useEquipmentMeterLogs(equipmentId)

  return (
    <AssetMeterLogsSection
      logs={logs}
      isLoading={isLoading}
      canManage={canManage}
      onAdd={onAdd}
    />
  )
}
