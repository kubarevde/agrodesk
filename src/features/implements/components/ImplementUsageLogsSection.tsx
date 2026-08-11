import { AssetMeterLogsSection } from '@/components/shared/AssetMeterLogsSection'
import { useImplementUsageLogs } from '../hooks'

type ImplementUsageLogsSectionProps = {
  implementId: string
  canManage: boolean
  onAdd: () => void
}

export function ImplementUsageLogsSection({
  implementId,
  canManage,
  onAdd,
}: ImplementUsageLogsSectionProps) {
  const { data: logs = [], isLoading } = useImplementUsageLogs(implementId)

  return (
    <AssetMeterLogsSection
      title="Журнал наработки"
      logs={logs}
      isLoading={isLoading}
      canManage={canManage}
      onAdd={onAdd}
      emptyLabel="Записей наработки пока нет"
    />
  )
}
