import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus, Wheat } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { resolveDictionaryLabel } from '@/features/dictionaries/labels'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useShipments } from '@/features/shipments/hooks'
import { formatKg, formatMoney, sumShipments } from '@/features/shipments/utils'
import { useShipmentRequest } from '../hooks'
import { ShipmentRequestKindBadge } from './ShipmentRequestKindBadge'
import { ShipmentRequestStatusBadge } from './ShipmentRequestStatusBadge'

type Props = { requestId: string }

export function ShipmentRequestDetailPage({ requestId }: Props) {
  const navigate = useNavigate()
  const { data: row, isLoading, isError } = useShipmentRequest(requestId)
  const { data: crops = [] } = useDictionary('crop')
  const { data: linked = [], isLoading: linkedLoading } = useShipments({
    shipmentRequestId: requestId,
  })
  const totals = sumShipments(linked)

  if (isLoading) return <PageSkeleton />
  if (isError || !row) {
    return (
      <EmptyState
        icon={Wheat}
        title="Заявка не найдена"
        description="Проверьте ссылку или вернитесь к списку."
        action={{ label: 'К заявкам', onClick: () => window.location.assign('/shipment-requests') }}
      />
    )
  }

  const canCreateCropShipment = row.kind === 'harvest' && row.status === 'done'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        {/* Same back pattern as SupportTicketPage / EquipmentDetailPage */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 min-h-11"
          onClick={() => void navigate({ to: '/shipment-requests' })}
        >
          <ArrowLeft className="size-4" />
          К списку
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Заявка</h1>
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap gap-2">
          <ShipmentRequestStatusBadge status={row.status} />
          <ShipmentRequestKindBadge row={row} />
        </div>
        <p className="text-lg font-medium text-foreground">{row.customerName}</p>
        <p className="text-sm text-muted-foreground">
          {row.inventoryItemName ?? 'ТМЦ'} · {row.quantity.toLocaleString('ru-RU')}{' '}
          {row.inventoryItemUnit} · {formatMoney(row.price)}
        </p>
        {row.cropCode ? (
          <p className="text-xs text-muted-foreground">
            Культура: {resolveDictionaryLabel(row.cropCode, crops)}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Склад: {row.inventoryOperationId ? 'списан при выполнении' : 'ещё не списан'}
        </p>
      </section>

      <section className="space-y-3">
        {/* Same header+action pattern as ShipmentsPageHeader / SupportListPage */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-foreground">Доход по урожаю</h2>
          {canCreateCropShipment ? (
            <Button
              type="button"
              className="min-h-11 shrink-0 bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={() =>
                void navigate({ to: '/shipments', search: { requestId: row.id } })
              }
            >
              <Plus className="size-4" />
              Создать запись отгрузки урожая
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Управленческая проекция для KPI. Не дублирует складское списание по заявке.
        </p>
        {linkedLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : linked.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title="Нет связанных отгрузок урожая"
            description={
              canCreateCropShipment
                ? 'Создайте запись в «Отгрузках урожая» и привяжите эту заявку.'
                : 'Доступно для выполненных заявок на урожай.'
            }
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {linked.map((shipment) => (
              <li key={shipment.id} className="flex justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{shipment.cropType}</p>
                  <p className="text-xs text-muted-foreground">{shipment.date}</p>
                </div>
                <div className="text-right">
                  <p>{formatKg(shipment.quantityKg)}</p>
                  <p className="text-xs text-muted-foreground">
                    {shipment.totalSum != null ? formatMoney(shipment.totalSum) : '—'}
                  </p>
                </div>
              </li>
            ))}
            <li className="flex justify-between px-3 py-2 text-sm font-medium">
              <span>Итого</span>
              <span>
                {formatKg(totals.totalKg)} / {formatMoney(totals.totalSum)}
              </span>
            </li>
          </ul>
        )}
      </section>
    </div>
  )
}
