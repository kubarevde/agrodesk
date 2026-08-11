import { Package } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { OnlineOnlyNotice } from '@/components/shared/OnlineOnlyNotice'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import type { TmcShipment } from '@/types'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useDeleteTmcShipment, useTmcShipments } from '../tmcHooks'
import {
  formatTmcShippedTotal,
  groupTmcShipmentsByItem,
  sumTmcRevenue,
} from '../tmcUtils'
import { ShipmentsFilters } from './ShipmentsFilters'
import { TmcShipmentFormModal } from './TmcShipmentFormModal'
import { TmcShipmentKpiCards } from './TmcShipmentKpiCards'
import { TmcShipmentsByItemChart } from './TmcShipmentsByItemChart'
import { TmcShipmentsCards, TmcShipmentsTable } from './TmcShipmentsList'

type Props = {
  from: string
  to: string
  defaultFrom: string
  defaultTo: string
  onRangeChange: (range: { from?: string; to?: string }) => void
  canManage: boolean
  canDelete: boolean
  formOpen: boolean
  onFormOpenChange: (open: boolean) => void
}

export function TmcShipmentsTab({
  from,
  to,
  defaultFrom,
  defaultTo,
  onRangeChange,
  canManage,
  canDelete,
  formOpen,
  onFormOpenChange,
}: Props) {
  const isOnline = useOnlineStatus()
  const [editing, setEditing] = useState<TmcShipment | null>(null)
  const filters = useMemo(() => ({ from, to }), [from, to])
  const { data: rows = [], isLoading } = useTmcShipments(filters, isOnline)
  const deleteShipment = useDeleteTmcShipment()

  const shippedLabel = formatTmcShippedTotal(rows)
  const revenue = sumTmcRevenue(rows)
  const chartData = useMemo(() => groupTmcShipmentsByItem(rows), [rows])

  const openEdit = (row: TmcShipment) => {
    setEditing(row)
    onFormOpenChange(true)
  }

  const closeForm = () => {
    setEditing(null)
    onFormOpenChange(false)
  }

  return (
    <div className="space-y-6" data-testid="tmc-shipments-tab" data-domain="tmc-shipments">
      {!isOnline ? (
        <OnlineOnlyNotice
          hideWhenOnline={false}
          title="Отгрузки ТМЦ: только онлайн-запись"
          description="Без сети создать отгрузку нельзя."
        />
      ) : null}

      <ShipmentsFilters
        from={from}
        to={to}
        onRangeChange={({ from: nextFrom, to: nextTo }) => {
          onRangeChange({
            from: nextFrom ?? defaultFrom,
            to: nextTo ?? defaultTo,
          })
        }}
        onCropChange={() => undefined}
        onVarietyChange={() => undefined}
        hideCrop
      />

      <TmcShipmentKpiCards
        shippedLabel={shippedLabel}
        totalRevenue={revenue}
        tripsCount={rows.length}
        isLoading={isLoading}
      />
      <TmcShipmentsByItemChart data={chartData} isLoading={isLoading} />

      {isLoading ? (
        <SkeletonTable rows={5} columns={8} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Отгрузок ТМЦ за период нет"
          description="Измените период или добавьте первую отгрузку по позиции склада (без урожая)."
          action={
            canManage
              ? {
                  label: 'Добавить отгрузку',
                  onClick: () => {
                    setEditing(null)
                    onFormOpenChange(true)
                  },
                }
              : undefined
          }
        />
      ) : (
        <>
          <TmcShipmentsCards
            rows={rows}
            canEdit={canManage}
            canDelete={canDelete}
            onEdit={openEdit}
            onDelete={(row) => deleteShipment.mutate(row.id)}
            onRowClick={canManage ? openEdit : undefined}
          />
          <TmcShipmentsTable
            rows={rows}
            canEdit={canManage}
            canDelete={canDelete}
            onEdit={openEdit}
            onDelete={(row) => deleteShipment.mutate(row.id)}
            onRowClick={canManage ? openEdit : undefined}
          />
        </>
      )}

      {canManage ? (
        <TmcShipmentFormModal
          key={editing?.id ?? 'create'}
          open={formOpen}
          shipment={editing}
          onClose={closeForm}
        />
      ) : null}
    </div>
  )
}
