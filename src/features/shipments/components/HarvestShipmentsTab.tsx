import { Truck } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { OnlineOnlyNotice } from '@/components/shared/OnlineOnlyNotice'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import type { Shipment } from '@/types'
import { ShipmentKpiCards } from './ShipmentKpiCards'
import { ShipmentsByCropChart } from './ShipmentsByCropChart'
import { ShipmentsCards } from './ShipmentsCards'
import { ShipmentsFilters } from './ShipmentsFilters'
import { ShipmentsTable } from './ShipmentsTable'

type ChartPoint = { cropType: string; quantityKg: number }

type Props = {
  from: string
  to: string
  cropType?: string
  varietyId?: string
  defaultFrom: string
  defaultTo: string
  onRangeChange: (range: { from?: string; to?: string }) => void
  onCropChange: (cropType: string | undefined) => void
  onVarietyChange: (varietyId: string | undefined) => void
  shipments: Shipment[]
  isLoading: boolean
  isOnline: boolean
  canManage: boolean
  canDelete: boolean
  totalKg: number
  totalRevenue: number
  chartData: ChartPoint[]
  onCreate: () => void
  onEdit: (shipment: Shipment) => void
  onDelete: (shipment: Shipment) => void
}

/** Harvest tab body — same filters/KPI/list as before the tab split. */
export function HarvestShipmentsTab({
  from,
  to,
  cropType,
  varietyId,
  defaultFrom,
  defaultTo,
  onRangeChange,
  onCropChange,
  onVarietyChange,
  shipments,
  isLoading,
  isOnline,
  canManage,
  canDelete,
  totalKg,
  totalRevenue,
  chartData,
  onCreate,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="space-y-6">
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
        varietyId={varietyId}
        onRangeChange={({ from: nextFrom, to: nextTo }) => {
          onRangeChange({
            from: nextFrom ?? defaultFrom,
            to: nextTo ?? defaultTo,
          })
        }}
        onCropChange={onCropChange}
        onVarietyChange={onVarietyChange}
      />
      <ShipmentKpiCards
        totalKg={totalKg}
        totalRevenue={totalRevenue}
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
            canManage ? { label: 'Добавить отгрузку', onClick: onCreate } : undefined
          }
        />
      ) : (
        <>
          <ShipmentsCards
            shipments={shipments}
            canEdit={canManage}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
            onRowClick={canManage ? onEdit : undefined}
          />
          <ShipmentsTable
            shipments={shipments}
            canEdit={canManage}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
            onRowClick={canManage ? onEdit : undefined}
          />
        </>
      )}
    </div>
  )
}
