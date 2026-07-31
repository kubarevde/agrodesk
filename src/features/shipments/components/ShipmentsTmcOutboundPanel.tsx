import { Link } from '@tanstack/react-router'
import { ClipboardList, Package } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrganizationSettings } from '@/features/settings/hooks'
import { useCurrentUser } from '@/features/auth/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { useShipmentRequests } from '@/features/shipment-requests/hooks'
import { hasAction } from '@/lib/permissionActions'
import { displayDateToIso } from '@/lib/transformers'
import { isoDay, isIsoDayInRange } from '../utils'

type Props = {
  /** Display dates dd.MM.yyyy (same as shipments filters). */
  from: string
  to: string
}

/**
 * Read-only warehouse outbound via shipment_requests with kind=inventory only.
 * Never feeds crop KPI / shipments list / harvest Excel.
 */
export function ShipmentsTmcOutboundPanel({ from, to }: Props) {
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

  if (!moduleOn || !canSee) return null

  return (
    <Card
      data-testid="shipments-tmc-outbound"
      data-domain="warehouse-only"
      className="border-dashed border-muted-foreground/30"
    >
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
          <Package className="size-4" />
          Отгрузки ТМЦ по заявкам (склад)
          {inPeriod.length > 0 ? (
            <Badge variant="secondary">{inPeriod.length}</Badge>
          ) : null}
        </CardTitle>
        <Link
          to="/shipment-requests"
          search={{ focus: 'active', createItemId: undefined }}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ClipboardList className="size-3.5" />
          К заявкам
        </Link>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">
          Отдельный обзор склада: только заявки типа «ТМЦ» (`kind=inventory`). Не входит в
          список урожая, KPI и отчёт по культурам выше. Заявки на урожай-на-складе — в
          разделе заявок.
        </p>
        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-md" />
        ) : inPeriod.length === 0 ? (
          <p className="text-muted-foreground">За период выполненных заявок ТМЦ нет</p>
        ) : (
          <ul className="space-y-2">
            {inPeriod.slice(0, 8).map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border px-3 py-2"
                data-source="shipment_request"
                data-kind="inventory"
              >
                <span className="font-medium text-foreground">
                  <Badge variant="outline" className="mr-2 text-muted-foreground">
                    ТМЦ
                  </Badge>
                  {row.inventoryItemName ?? 'Позиция'} · {row.customerName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.quantity.toLocaleString('ru-RU')} {row.inventoryItemUnit} · источник:
                  заявка
                  {row.shiftId ? ` · смена ${row.shiftId.slice(0, 8)}…` : ''}
                </span>
              </li>
            ))}
            {inPeriod.length > 8 ? (
              <p className="text-xs text-muted-foreground">
                Ещё {inPeriod.length - 8} — смотрите раздел заявок или отчёт «Заявки на
                отгрузку».
              </p>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
