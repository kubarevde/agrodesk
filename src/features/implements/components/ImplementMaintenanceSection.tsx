import { AssetMaintenanceHistorySection } from '@/components/shared/AssetMaintenanceHistorySection'
import { useImplementMaintenance } from '../hooks'

type ImplementMaintenanceSectionProps = {
  implementId: string
  canManage: boolean
  onAdd: () => void
}

export function ImplementMaintenanceSection({
  implementId,
  canManage,
  onAdd,
}: ImplementMaintenanceSectionProps) {
  const { data: records = [], isLoading } = useImplementMaintenance(implementId)

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
