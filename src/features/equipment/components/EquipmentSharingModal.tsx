import { SharingListingModal } from '@/features/sharing/components/SharingListingModal'
import type { EquipmentDetail } from '../types'

type EquipmentSharingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: EquipmentDetail | null
}

export function EquipmentSharingModal({
  open,
  onOpenChange,
  item,
}: EquipmentSharingModalProps) {
  return (
    <SharingListingModal
      open={open}
      onClose={() => onOpenChange(false)}
      preset={
        item
          ? {
              type: 'equipment',
              equipmentId: item.id,
              title: item.name,
              lat: item.latitude,
              lng: item.longitude,
            }
          : undefined
      }
    />
  )
}
