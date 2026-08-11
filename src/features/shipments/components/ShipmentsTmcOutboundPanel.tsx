import { useNavigate } from '@tanstack/react-router'
import { ClipboardList, Package, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import { useOrganizationSettings } from '@/features/settings/hooks'
import { useCurrentUser } from '@/features/auth/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { useShipmentRequests } from '@/features/shipment-requests/hooks'
import { hasAction } from '@/lib/permissionActions'
import { displayDateToIso } from '@/lib/transformers'
import { isoDay, isIsoDayInRange } from '../utils'
import { ShipmentsTmcList } from './ShipmentsTmcList'

type Props = {
  /** Display dates dd.MM.yyyy (same as shipments filters). */
  from: string
  to: string
  canCreate?: boolean
  onCreate?: () => void
}

/**
 * Warehouse outbound via completed inventory shipment requests.
 * Never feeds crop KPI / shipments list / harvest Excel.
 */
export function ShipmentsTmcOutboundPanel({ from, to, canCreate, onCreate }: Props) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const { data: orgSettings } = useOrganizationSettings()
  const moduleOn = orgSettings?.shipmentRequestsEnabled !== false
  const canSee = hasAction(
    perms?.actions,
    'shipment_requests.manage',
    user?.role,
  )

  const { data: rows = [], isLoading } = useShipmentRequests(
    { status: 'done', kind: 'inventory' },
    moduleOn && canSee,
  )

  const fromIso = displayDateToIso(from)
  const toIso = displayDateToIso(to)

  const inPeriod = useMemo(
    () =>
      rows.filter((row) =>
        isIsoDayInRange(isoDay(row.completedAt), fromIso, toIso),
      ),
    [rows, fromIso, toIso],
  )

  const openRequest = (id: string) => {
    void navigate({
      to: '/shipment-requests/$requestId',
      params: { requestId: id },
    })
  }

  const goToActiveRequests = () => {
    void navigate({
      to: '/shipment-requests',
      search: { focus: 'active', createItemId: undefined },
    })
  }

  if (!moduleOn) {
    return (
      <EmptyState
        icon={Package}
        title="Модуль заявок отключён"
        description="Включите заявки на отгрузку в настройках организации."
      />
    )
  }

  if (!canSee) {
    return (
      <EmptyState
        icon={Package}
        title="Нет доступа"
        description="Нужно право управлять заявками на отгрузку."
      />
    )
  }

  return (
    <div
      className="space-y-4"
      data-testid="shipments-tmc-outbound"
      data-domain="warehouse-only"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Выполненные заявки на отгрузку ТМЦ со склада за выбранный период. Не входят в KPI и
          отчёт по культурам — только складской учёт. Новая отгрузка создаёт заявку; после
          выполнения она появится в этом списке.
        </p>
        <div className="flex flex-wrap gap-2">
          {canCreate && onCreate ? (
            <Button type="button" size="sm" onClick={onCreate}>
              <Plus className="size-3.5" />
              Добавить отгрузку
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={goToActiveRequests}>
            <ClipboardList className="size-3.5" />
            К заявкам
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : inPeriod.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Отгрузок ТМЦ за период нет"
          description="Измените период, добавьте отгрузку ТМЦ или выполните существующую заявку."
          action={
            canCreate && onCreate
              ? { label: 'Добавить отгрузку', onClick: onCreate }
              : { label: 'К активным заявкам', onClick: goToActiveRequests }
          }
        />
      ) : (
        <ShipmentsTmcList rows={inPeriod} onOpen={openRequest} />
      )}
    </div>
  )
}
