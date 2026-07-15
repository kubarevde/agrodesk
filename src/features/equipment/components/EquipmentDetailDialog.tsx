import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ImplementResponse } from '@/features/implements/types'
import {
  nextServiceHours,
  resolveToStatus,
  type EquipmentDetail,
} from '../types'
import { ToStatusBadge } from './ToStatusBadge'

type EquipmentDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: EquipmentDetail | null
  implements: ImplementResponse[]
}

export function EquipmentDetailDialog({
  open,
  onOpenChange,
  item,
  implements: attached,
}: EquipmentDetailDialogProps) {
  const nextAt = item ? nextServiceHours(item.next_to_at, item.maintenance) : null
  const status = item ? resolveToStatus(item.to_status, item.maintenance) : 'no_data'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item?.name ?? 'Техника'}</DialogTitle>
        </DialogHeader>
        {item ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              {item.type ? <Badge variant="secondary">{item.type}</Badge> : null}
              <ToStatusBadge status={status} />
            </div>
            <p className="text-muted-foreground">
              Счётчик: {item.current_meter} {item.meter_label}
              {nextAt != null ? ` / ТО на ${nextAt}` : ''}
            </p>
            {item.year_of_manufacture != null ? (
              <p className="text-muted-foreground">Год: {item.year_of_manufacture}</p>
            ) : null}
            {item.serial_number ? (
              <p className="text-muted-foreground">Серийный номер: {item.serial_number}</p>
            ) : null}
            {item.meter_type === 'shift_hours' ? (
              <p className="text-muted-foreground">Автозапись из смен</p>
            ) : null}
            {attached.length > 0 ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">Приспособления</p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {attached.map((row) => (
                    <li key={row.id}>{row.name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground">Приспособления не прикреплены</p>
            )}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
