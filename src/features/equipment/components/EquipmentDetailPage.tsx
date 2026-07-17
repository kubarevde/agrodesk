import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Tractor } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import {
  useEquipmentDetail,
  useEquipmentInstall,
  useEquipmentRefuel,
  useUpdateEquipment,
} from '@/features/equipment/hooks'
import type { EquipmentFormValues } from '@/features/equipment/schemas'
import { EquipmentDetailHeader } from './EquipmentDetailHeader'
import { EquipmentExpensesSection } from './EquipmentExpensesSection'
import { EquipmentFormDialog } from './EquipmentFormDialog'
import { EquipmentImplementsSection } from './EquipmentImplementsSection'
import { EquipmentMaintenanceSection } from './EquipmentMaintenanceSection'
import { EquipmentMeterLogsSection } from './EquipmentMeterLogsSection'
import { EquipmentSharingModal } from './EquipmentSharingModal'
import { EquipmentStockModal } from './EquipmentStockModal'
import { EquipmentStockSection } from './EquipmentStockSection'
import { MaintenanceModal } from './MaintenanceModal'
import { MeterLogModal } from './MeterLogModal'
import { RepairHistorySection } from '@/features/repair-journal/components/RepairHistorySection'

type EquipmentDetailPageProps = {
  equipmentId: string
}

export function EquipmentDetailPage({ equipmentId }: EquipmentDetailPageProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  const { data: item, isLoading, isError } = useEquipmentDetail(equipmentId)
  const updateItem = useUpdateEquipment()
  const refuel = useEquipmentRefuel(equipmentId)
  const install = useEquipmentInstall(equipmentId)

  const [editOpen, setEditOpen] = useState(false)
  const [meterOpen, setMeterOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [stockOpen, setStockOpen] = useState(false)

  if (isLoading) return <PageSkeleton />
  if (isError || !item) {
    return (
      <EmptyState
        icon={Tractor}
        title="Техника не найдена"
        description="Проверьте ссылку или вернитесь к списку."
        action={{ label: 'К списку', onClick: () => void navigate({ to: '/equipment' }) }}
      />
    )
  }

  const handleSubmit = async (values: EquipmentFormValues) => {
    await updateItem.mutateAsync({ id: item.id, values })
  }

  return (
    <div className="space-y-6">
      <Button
        type="button"
        variant="ghost"
        className="gap-2 px-0 text-muted-foreground"
        onClick={() => void navigate({ to: '/equipment' })}
      >
        <ArrowLeft className="size-4" />
        К списку техники
      </Button>

      <EquipmentDetailHeader
        item={item}
        canManage={canManage}
        onEdit={() => setEditOpen(true)}
        onMeterLog={() => setMeterOpen(true)}
        onMaintenance={() => setToOpen(true)}
        onStock={() => setStockOpen(true)}
      />

      <EquipmentImplementsSection equipmentId={item.id} canManage={canManage} />
      <EquipmentMeterLogsSection
        equipmentId={item.id}
        canManage={canManage}
        onAdd={() => setMeterOpen(true)}
      />
      <EquipmentMaintenanceSection
        equipmentId={item.id}
        canManage={canManage}
        onAdd={() => setToOpen(true)}
      />
      <RepairHistorySection equipmentId={item.id} canManage={canManage} />

      {canManage ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <EquipmentStockSection
            title="Заправки"
            equipmentId={item.id}
            purpose="refuel"
            isPending={refuel.isPending}
            onSubmit={(values) => refuel.mutateAsync(values)}
          />
          <EquipmentStockSection
            title="Установленные материалы"
            equipmentId={item.id}
            purpose="install"
            isPending={install.isPending}
            onSubmit={(values) => install.mutateAsync(values)}
          />
        </div>
      ) : null}

      <EquipmentExpensesSection equipmentId={item.id} canManage={canManage} />

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">Шеринг</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            Нет активного объявления
          </Badge>
          {canManage ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setShareOpen(true)}>
              Выставить в шеринг
            </Button>
          ) : null}
        </div>
      </section>

      <EquipmentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={item}
        isPending={updateItem.isPending}
        onSubmit={handleSubmit}
      />
      <MeterLogModal
        open={meterOpen}
        onOpenChange={setMeterOpen}
        equipmentId={item.id}
        meterLabel={item.meter_label}
      />
      <MaintenanceModal
        open={toOpen}
        onOpenChange={setToOpen}
        equipmentId={item.id}
        meterLabel={item.meter_label}
        currentMeter={item.current_meter}
      />
      <EquipmentSharingModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        item={item}
      />
      <EquipmentStockModal
        open={stockOpen}
        onOpenChange={setStockOpen}
        equipmentId={item.id}
      />
    </div>
  )
}
