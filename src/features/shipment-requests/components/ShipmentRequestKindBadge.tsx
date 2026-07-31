import { Badge } from '@/components/ui/badge'
import type { ShipmentRequest } from '../types'

/** Distinguishes harvest-as-SKU requests from ordinary materials. */
export function ShipmentRequestKindBadge({ row }: { row: ShipmentRequest }) {
  const harvest = row.kind === 'harvest' || row.isHarvest
  if (harvest) {
    return (
      <Badge
        variant="outline"
        className="w-fit border-primary/40 text-primary"
        data-kind="harvest"
      >
        Заявка на урожай
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="w-fit text-muted-foreground" data-kind="inventory">
      Заявка ТМЦ
    </Badge>
  )
}
