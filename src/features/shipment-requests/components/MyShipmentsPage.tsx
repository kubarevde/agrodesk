import { Truck } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/features/auth/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { hasAction } from '@/lib/permissionActions'
import { useMyShipmentRequests, useStartShipmentRequest } from '../hooks'
import type { ShipmentRequest } from '../types'
import { MyShipmentCompleteDialog } from './MyShipmentCompleteDialog'
import { MyShipmentRequestsList } from './MyShipmentRequestsList'

export function MyShipmentsPage() {
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const canExecute = hasAction(perms?.actions, 'shipment_requests.execute', user?.role)
  const { data: rows = [], isLoading } = useMyShipmentRequests(canExecute)
  const start = useStartShipmentRequest()
  const [completeRow, setCompleteRow] = useState<ShipmentRequest | null>(null)

  if (!canExecute) {
    return (
      <EmptyState
        icon={Truck}
        title="Нет доступа"
        description="Раздел доступен при праве «Исполнять заявки на отгрузку ТМЦ»."
      />
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
          <h1 className="text-2xl font-semibold text-foreground">Мои заявки ТМЦ</h1>
        <p className="text-sm text-muted-foreground">
          Заявки без исполнителя и назначенные вам. Списание ТМЦ — только при «Выполнено».
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Нет заявок"
          description="Когда появится задача на отгрузку, она отобразится здесь."
        />
      ) : (
        <MyShipmentRequestsList
          rows={rows}
          busyId={start.isPending ? (start.variables ?? null) : null}
          onStart={(id) => start.mutate(id)}
          onComplete={setCompleteRow}
        />
      )}

      <MyShipmentCompleteDialog
        row={completeRow}
        open={Boolean(completeRow)}
        onClose={() => setCompleteRow(null)}
      />
    </div>
  )
}
