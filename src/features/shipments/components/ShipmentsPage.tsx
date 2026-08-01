import { Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { OnlineOnlyNotice } from '@/components/shared/OnlineOnlyNotice'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
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
import { ShipmentsCards } from './ShipmentsCards'
import { ShipmentsFilters } from './ShipmentsFilters'
import { ShipmentsPageHeader } from './ShipmentsPageHeader'
import { ShipmentsTable } from './ShipmentsTable'
import { ShipmentsTmcOutboundPanel } from './ShipmentsTmcOutboundPanel'

export function ShipmentsPage({ initialRequestId = null }: { initialRequestId?: string | null }) {
  const { data: user } = useCurrentUser()
  const isOnline = useOnlineStatus()
  const canManage = (user?.role === 'admin' || user?.role === 'manager') && isOnline
  const canDelete = user?.role === 'admin' && isOnline

  // Default = current calendar month; same from/to drive list, chart, and summary KPIs.
  const defaultRange = useMemo(() => getDefaultMonthRange(), [])
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [cropType, setCropType] = useState<string | undefined>()
  // Backend filters by Shipment.date (хозяйственная дата отгрузки), inclusive from/to.
  const filters = useMemo(() => ({ from, to, cropType }), [cropType, from, to])

  const { data: shipments = [], isLoading, isError } = useShipments(filters)
  const deleteShipment = useDeleteShipment()
  const [formOpen, setFormOpen] = useState(Boolean(initialRequestId))
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const [prefillRequestId, setPrefillRequestId] = useState<string | null>(initialRequestId)

  useEffect(() => {
    if (initialRequestId) {
      setPrefillRequestId(initialRequestId)
      setEditingShipment(null)
      setFormOpen(true)
    }
  }, [initialRequestId])

  // KPI from the same filtered set as table/chart (not a separate month-only query).
  const periodTotals = useMemo(() => sumShipments(shipments), [shipments])
  const chartData = useMemo(() => groupShipmentsByCrop(shipments), [shipments])

  useEffect(() => {
    if (isError) toast.error('Не удалось загрузить отгрузки')
  }, [isError])

  const openCreate = () => {
    setEditingShipment(null)
    setPrefillRequestId(null)
    setFormOpen(true)
  }

  const openEdit = (shipment: Shipment) => {
    setPrefillRequestId(null)
    setEditingShipment(shipment)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <ShipmentsPageHeader canManage={Boolean(canManage)} onCreate={openCreate} />
      <RoleSectionHelp section="отгрузки" items={shipmentsHelp} />
      {!isOnline ? (
        <OnlineOnlyNotice
          hideWhenOnline={false}
          title="Отгрузки урожая: только онлайн-запись"
          description="Без сети создать отгрузку нельзя. Смены доступны офлайн в «Рабочем времени»."
        />
      ) : null}
      <ShipmentsFilters
        from={from}
        to={to}
        cropType={cropType}
        onRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom ?? defaultRange.from)
          setTo(nextTo ?? defaultRange.to)
        }}
        onCropChange={setCropType}
      />
      <ShipmentKpiCards
        totalKg={periodTotals.totalKg}
        totalRevenue={periodTotals.totalSum}
        tripsCount={shipments.length}
        isLoading={isLoading}
      />
      <ShipmentsByCropChart data={chartData} isLoading={isLoading} />
      {isLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : shipments.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Отгрузок урожая за период нет"
          description="Измените фильтры или добавьте первую отгрузку культуры"
          action={
            canManage ? { label: 'Добавить отгрузку', onClick: openCreate } : undefined
          }
        />
      ) : (
        <>
          <ShipmentsCards
            shipments={shipments}
            canEdit={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            onEdit={openEdit}
            onDelete={(s) => deleteShipment.mutate(s.id)}
          />
          <ShipmentsTable
            shipments={shipments}
            canEdit={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            onEdit={openEdit}
            onDelete={(s) => deleteShipment.mutate(s.id)}
          />
        </>
      )}
      {/* Warehouse overview only — below harvest list, never mixed into crop KPI */}
      <ShipmentsTmcOutboundPanel from={from} to={to} />
      {canManage ? (
        <ShipmentFormModal
          key={editingShipment?.id ?? prefillRequestId ?? 'create'}
          open={formOpen}
          shipment={editingShipment}
          initialRequestId={prefillRequestId}
          onClose={() => {
            setFormOpen(false)
            setEditingShipment(null)
            setPrefillRequestId(null)
          }}
        />
      ) : null}
    </div>
  )
}
