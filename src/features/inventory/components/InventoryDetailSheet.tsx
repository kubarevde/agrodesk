import { Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { humanLabel } from '@/lib/display'
import type { InventoryItem } from '@/types'
import { getCategoryLabel, isCriticalStock } from '@/features/inventory/utils'
import { StockProgressBar } from './StockProgressBar'

type InventoryDetailSheetProps = {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
}

export function InventoryDetailSheet({ item, open, onClose }: InventoryDetailSheetProps) {
  if (!item) return null

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="size-5 text-primary" aria-hidden />
            {humanLabel(item.name, 'Товар')}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
            {isCriticalStock(item) ? (
              <Badge variant="destructive">Критичный остаток</Badge>
            ) : (
              <Badge variant="secondary">В норме</Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6 text-sm">
          <div>
            <p className="text-muted-foreground">Остаток</p>
            <p className="text-2xl font-semibold text-foreground">
              {item.currentStock.toLocaleString('ru-RU')}{' '}
              <span className="text-base font-normal text-muted-foreground">{item.unit}</span>
            </p>
          </div>
          <StockProgressBar item={item} />
          <Row
            label="Мин. запас"
            value={`${item.minStock.toLocaleString('ru-RU')} ${item.unit}`}
          />
          <Row
            label="Ёмкость"
            value={`${item.totalCapacity.toLocaleString('ru-RU')} ${item.unit}`}
          />
          <Row label="Статус позиции" value={item.isActive ? 'Активна' : 'Неактивна'} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}
