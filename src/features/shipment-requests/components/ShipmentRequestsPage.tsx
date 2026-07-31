import { ClipboardList, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { shipmentRequestsHelp } from '@/features/help/content'
import { useCurrentUser } from '@/features/auth/hooks'
import { useInventory } from '@/features/inventory/hooks'
import { useOrganizationSettings } from '@/features/settings/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { hasAction } from '@/lib/permissionActions'
import {
  useCancelShipmentRequest,
  useCompleteShipmentRequest,
  useShipmentRequests,
  useStartShipmentRequest,
} from '../hooks'
import type { ShipmentRequest, ShipmentRequestFilters } from '../types'
import { ShipmentRequestAssignDialog } from './ShipmentRequestAssignDialog'
import { ShipmentRequestCancelDialog } from './ShipmentRequestCancelDialog'
import { ShipmentRequestFiltersBar } from './ShipmentRequestFiltersBar'
import { ShipmentRequestFormDialog } from './ShipmentRequestFormDialog'
import { ShipmentRequestsList } from './ShipmentRequestsList'

const routeApi = getRouteApi('/_layout/shipment-requests/')

type Props = { initialCreateItemId?: string | null }

const isActive = (row: ShipmentRequest) =>
  row.status === 'new' || row.status === 'in_progress'

export function ShipmentRequestsPage({ initialCreateItemId = null }: Props) {
  const { focus } = routeApi.useSearch()
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const { data: orgSettings } = useOrganizationSettings()
  const enabled = orgSettings?.shipmentRequestsEnabled !== false
  const canManage = hasAction(perms?.actions, 'shipment_requests.manage', user?.role)
  const canExecute = hasAction(perms?.actions, 'shipment_requests.execute', user?.role)
  const [filters, setFilters] = useState<ShipmentRequestFilters>({})
  const [formOpen, setFormOpen] = useState(Boolean(initialCreateItemId))
  const [prefillItemId, setPrefillItemId] = useState<string | null>(initialCreateItemId)
  const [assignRow, setAssignRow] = useState<ShipmentRequest | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const { data: rows = [], isLoading } = useShipmentRequests(
    filters,
    enabled && (canManage || canExecute),
  )
  const { data: inventory = [] } = useInventory({
    enabled: enabled && (canManage || canExecute),
  })
  const start = useStartShipmentRequest()
  const complete = useCompleteShipmentRequest()
  const cancel = useCancelShipmentRequest()

  const visible = useMemo(
    () => (focus === 'active' ? rows.filter(isActive) : rows),
    [rows, focus],
  )
  const busyId = start.isPending
    ? (start.variables ?? null)
    : complete.isPending
      ? (complete.variables?.id ?? null)
      : cancel.isPending
        ? (cancel.variables?.id ?? null)
        : null

  if (!enabled) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Модуль отключён"
        description="Заявки на отгрузку выключены в настройках организации."
      />
    )
  }
  if (!canManage && !canExecute) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Нет доступа"
        description="Нужно право «Управлять заявками на отгрузку ТМЦ»."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Заявки на отгрузку</h1>
          <p className="text-sm text-muted-foreground">
            Списание ТМЦ — только при выполнении заявки
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            onClick={() => {
              setPrefillItemId(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            Заявка
          </Button>
        ) : null}
      </div>

      <ShipmentRequestFiltersBar filters={filters} onChange={setFilters} inventoryItems={inventory} />

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Заявок нет"
          description="Создайте заявку или измените фильтры."
          action={
            canManage
              ? {
                  label: 'Создать заявку',
                  onClick: () => {
                    setPrefillItemId(null)
                    setFormOpen(true)
                  },
                }
              : undefined
          }
        />
      ) : (
        <ShipmentRequestsList
          rows={visible}
          canManage={canManage}
          busyId={busyId}
          onStart={(id) => start.mutate(id)}
          onComplete={(id) => complete.mutate({ id })}
          onCancel={(id) => setCancelId(id)}
          onAssign={(id) => setAssignRow(visible.find((r) => r.id === id) ?? null)}
        />
      )}

      {canManage ? (
        <>
          <ShipmentRequestFormDialog
            open={formOpen}
            initialInventoryItemId={prefillItemId}
            onClose={() => {
              setFormOpen(false)
              setPrefillItemId(null)
            }}
          />
          <ShipmentRequestAssignDialog
            row={assignRow}
            open={Boolean(assignRow)}
            onClose={() => setAssignRow(null)}
          />
          <ShipmentRequestCancelDialog
            open={Boolean(cancelId)}
            pending={cancel.isPending}
            onClose={() => setCancelId(null)}
            onConfirm={(reason) => {
              if (!cancelId) return
              cancel.mutate(
                { id: cancelId, reason },
                { onSuccess: () => setCancelId(null) },
              )
            }}
          />
        </>
      ) : null}

      <RoleSectionHelp section="заявки на отгрузку" items={shipmentRequestsHelp} />
    </div>
  )
}
