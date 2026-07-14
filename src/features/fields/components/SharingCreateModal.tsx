import { SharingListingModal } from '@/features/sharing/components/SharingListingModal'
import type { FieldResponse } from '../types'

type SharingCreateModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: FieldResponse | null
}

export function SharingCreateModal({ open, onOpenChange, field }: SharingCreateModalProps) {
  return (
    <SharingListingModal
      open={open}
      onClose={() => onOpenChange(false)}
      preset={
        field
          ? {
              type: 'field',
              fieldId: field.id,
              title: `Аренда: ${field.name}`,
              lat: field.latitude,
              lng: field.longitude,
            }
          : undefined
      }
    />
  )
}
