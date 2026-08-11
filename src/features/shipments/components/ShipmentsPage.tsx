import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Shipment } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { getShipmentsPageHelp } from '@/features/help/pageTabHelp'
import { useDeleteShipment, useShipments } from '@/features/shipments/hooks'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  filterHarvestShipments,
  groupShipmentsByCrop,
  sumShipments,
} from '@/features/shipments/utils'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { HarvestShipmentsTab } from './HarvestShipmentsTab'
import { ShipmentFormModal } from './ShipmentFormModal'
import { ShipmentsPageHeader } from './ShipmentsPageHeader'
import { TmcShipmentsTab } from './TmcShipmentsTab'

const shipmentsRoute = getRouteApi('/_layout/shipments/')

export function ShipmentsPage({
  initialRequestId = null,
  initialTab = 'harvest',
}: {
  initialRequestId?: string | null
  initialTab?: 'harvest' | 'tmc'
}) {
  const navigate = shipmentsRoute.useNavigate()
  const { data: user } = useCurrentUser()
  const isOnline = useOnlineStatus()
  const canManage = (user?.role === 'admin' || user?.role === 'manager') && isOnline
  const canDelete = user?.role === 'admin' && isOnline

  const defaultRange = useMemo(() => getDefaultMonthRange(), [])
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [cropType, setCropType] = useState<string | undefined>()
  const [varietyId, setVarietyId] = useState<string | undefined>()
  const filters = useMemo(
    () => ({ from, to, cropType, varietyId }),
    [cropType, from, to, varietyId],
  )

  const { data: remoteShipments = [], isLoading, isError } = useShipments(filters)
  const shipments = useMemo(
    () => filterHarvestShipments(remoteShipments, { cropType, varietyId }),
    [cropType, remoteShipments, varietyId],
  )
  const deleteShipment = useDeleteShipment()
  const [formOpen, setFormOpen] = useState(Boolean(initialRequestId))
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const [prefillRequestId, setPrefillRequestId] = useState<string | null>(initialRequestId)
  const [tmcFormOpen, setTmcFormOpen] = useState(false)

  const tab = initialTab === 'tmc' ? 'tmc' : 'harvest'
  const periodTotals = useMemo(() => sumShipments(shipments), [shipments])
  const chartData = useMemo(() => groupShipmentsByCrop(shipments), [shipments])

  useEffect(() => {
    if (initialRequestId) {
      setPrefillRequestId(initialRequestId)
      setEditingShipment(null)
      setFormOpen(true)
      void navigate({
        search: (prev) => ({ ...prev, tab: 'harvest', requestId: initialRequestId }),
      })
    }
  }, [initialRequestId, navigate])

  useEffect(() => {
    if (isError) toast.error('Не удалось загрузить отгрузки')
  }, [isError])

  const openCreateHarvest = () => {
    setEditingShipment(null)
    setPrefillRequestId(null)
    setFormOpen(true)
  }

  const openEdit = (shipment: Shipment) => {
    setPrefillRequestId(null)
    setEditingShipment(shipment)
    setFormOpen(true)
  }

  const onRangeChange = ({ from: nextFrom, to: nextTo }: { from?: string; to?: string }) => {
    setFrom(nextFrom ?? defaultRange.from)
    setTo(nextTo ?? defaultRange.to)
  }

  const tabHelp = getShipmentsPageHelp(tab)

  return (
    <div className="space-y-6">
      <ShipmentsPageHeader
        canManage={Boolean(canManage)}
        showCreate={Boolean(canManage)}
        createLabel="Добавить отгрузку"
        onCreate={tab === 'tmc' ? () => setTmcFormOpen(true) : openCreateHarvest}
      />

      <Tabs
        value={tab}
        onValueChange={(value) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              tab: value === 'tmc' ? 'tmc' : 'harvest',
              requestId: undefined,
            }),
          })
        }
        className="w-full min-w-0 gap-4"
      >
        <TabsList className="grid h-auto min-h-11 w-full grid-cols-2 p-1">
          <TabsTrigger value="harvest" className="min-h-10 px-2 py-2 text-sm">
            Урожай
          </TabsTrigger>
          <TabsTrigger value="tmc" className="min-h-10 px-2 py-2 text-sm">
            ТМЦ со склада
          </TabsTrigger>
        </TabsList>

        <RoleSectionHelp key={tab} section={tabHelp.section} items={tabHelp.items} />

        <TabsContent value="harvest" className="mt-4">
          <HarvestShipmentsTab
            from={from}
            to={to}
            cropType={cropType}
            varietyId={varietyId}
            defaultFrom={defaultRange.from}
            defaultTo={defaultRange.to}
            onRangeChange={onRangeChange}
            onCropChange={(next) => {
              setCropType(next)
              setVarietyId(undefined)
            }}
            onVarietyChange={setVarietyId}
            shipments={shipments}
            isLoading={isLoading}
            isOnline={isOnline}
            canManage={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            totalKg={periodTotals.totalKg}
            totalRevenue={periodTotals.totalSum}
            chartData={chartData}
            onCreate={openCreateHarvest}
            onEdit={openEdit}
            onDelete={(s) => deleteShipment.mutate(s.id)}
          />
        </TabsContent>

        <TabsContent value="tmc" className="mt-4">
          <TmcShipmentsTab
            from={from}
            to={to}
            defaultFrom={defaultRange.from}
            defaultTo={defaultRange.to}
            onRangeChange={onRangeChange}
            canManage={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            formOpen={tmcFormOpen}
            onFormOpenChange={setTmcFormOpen}
          />
        </TabsContent>
      </Tabs>

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
