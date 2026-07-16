import { Plus, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { OnlineOnlyNotice } from '@/components/shared/OnlineOnlyNotice'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import type { Shipment } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { shipmentsHelp } from '@/features/help/content'
import {
  useDeleteShipment,
  useShipments,
} from '@/features/shipments/hooks'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  groupShipmentsByCrop,
  sumShipments,
} from '@/features/shipments/utils'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { ShipmentFormModal } from './ShipmentFormModal'
import { ShipmentKpiCards } from './ShipmentKpiCards'
import { ShipmentsByCropChart } from './ShipmentsByCropChart'
import { ShipmentsFilters } from './ShipmentsFilters'
import { ShipmentsTable } from './ShipmentsTable'

export function ShipmentsPage() {
  const { data: user } = useCurrentUser()
  const isOnline = useOnlineStatus()
  const canManage = (user?.role === 'admin' || user?.role === 'manager') && isOnline
  const canDelete = user?.role === 'admin' && isOnline

  const monthRange = useMemo(() => getDefaultMonthRange(), [])
  const [from, setFrom] = useState(monthRange.from)
  const [to, setTo] = useState(monthRange.to)
  const [cropType, setCropType] = useState<string | undefined>()

  const filters = useMemo(
    () => ({ from, to, cropType }),
    [cropType, from, to],
  )

  const {
    data: monthShipments = [],
    isLoading: monthLoading,
    isError: monthError,
  } = useShipments(monthRange)

  const {
    data: shipments = [],
    isLoading,
    isError,
  } = useShipments(filters)

  const deleteShipment = useDeleteShipment()
  const [formOpen, setFormOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)

  const monthTotals = useMemo(() => sumShipments(monthShipments), [monthShipments])
  const chartData = useMemo(() => groupShipmentsByCrop(shipments), [shipments])

  useEffect(() => {
    if (isError || monthError) {
      toast.error('Не удалось загрузить отгрузки')
    }
  }, [isError, monthError])

  const openCreate = () => {
    setEditingShipment(null)
    setFormOpen(true)
  }

  const openEdit = (shipment: Shipment) => {
    setEditingShipment(shipment)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Отгрузки</h1>
        {canManage ? (
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Добавить отгрузку
          </Button>
        ) : null}
      </div>

      <SectionHelp title="Справка: отгрузки" items={shipmentsHelp} />

      {!isOnline ? (
        <OnlineOnlyNotice
          hideWhenOnline={false}
          title="Отгрузки: только онлайн-запись"
          description="Без сети создать отгрузку нельзя. Смены доступны офлайн в «Рабочем времени»."
        />
      ) : null}

      <ShipmentKpiCards
        totalKg={monthTotals.totalKg}
        totalRevenue={monthTotals.totalSum}
        tripsCount={monthShipments.length}
        isLoading={monthLoading}
      />

      <ShipmentsFilters
        from={from}
        to={to}
        cropType={cropType}
        onRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom ?? monthRange.from)
          setTo(nextTo ?? monthRange.to)
        }}
        onCropChange={setCropType}
      />

      <ShipmentsByCropChart data={chartData} isLoading={isLoading} />

      {isLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : shipments.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Отгрузок за период нет"
          description="Измените фильтры или добавьте первую отгрузку"
          action={
            canManage
              ? { label: 'Добавить отгрузку', onClick: openCreate }
              : undefined
          }
        />
      ) : (
        <ShipmentsTable
          shipments={shipments}
          canEdit={Boolean(canManage)}
          canDelete={Boolean(canDelete)}
          onEdit={openEdit}
          onDelete={(shipment) => deleteShipment.mutate(shipment.id)}
        />
      )}

      {canManage ? (
        <ShipmentFormModal
          key={editingShipment?.id ?? 'create'}
          open={formOpen}
          shipment={editingShipment}
          onClose={() => {
            setFormOpen(false)
            setEditingShipment(null)
          }}
        />
      ) : null}
    </div>
  )
}
