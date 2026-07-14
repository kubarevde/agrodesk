import { SharingListingModal } from '@/features/sharing/components/SharingListingModal'
import type { ImplementResponse } from '../types'

type ImplementSharingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ImplementResponse | null
}

export function ImplementSharingModal({
  open,
  onOpenChange,
  item,
}: ImplementSharingModalProps) {
  return (
    <SharingListingModal
      open={open}
      onClose={() => onOpenChange(false)}
      preset={
        item
          ? {
              type: 'implement',
              implementId: item.id,
              title: item.name,
              relatedEquipmentId: item.current_equipment_id ?? '',
            }
          : undefined
      }
    />
  )
}
