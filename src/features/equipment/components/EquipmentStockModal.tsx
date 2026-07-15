import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEquipmentInstall, useEquipmentRefuel } from '../hooks'
import { EquipmentStockSection } from './EquipmentStockSection'

type EquipmentStockModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentId: string
}

export function EquipmentStockModal({
  open,
  onOpenChange,
  equipmentId,
}: EquipmentStockModalProps) {
  const refuel = useEquipmentRefuel(equipmentId)
  const install = useEquipmentInstall(equipmentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Заправки и ТМЦ</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <EquipmentStockSection
            title="Заправки"
            equipmentId={equipmentId}
            purpose="refuel"
            isPending={refuel.isPending}
            onSubmit={(values) => refuel.mutateAsync(values)}
          />
          <EquipmentStockSection
            title="Установлено"
            equipmentId={equipmentId}
            purpose="install"
            isPending={install.isPending}
            onSubmit={(values) => install.mutateAsync(values)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
