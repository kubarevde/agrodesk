import { Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EntityHistoryButton } from '@/features/audit-log/components/EntityHistoryButton'
import { humanLabel } from '@/lib/display'
import type { InventoryItem } from '@/types'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useInventoryItemOperations } from '@/features/inventory/hooks'
import {
  getCategoryLabel,
  isCriticalStock,
  isHarvestCategory,
} from '@/features/inventory/utils'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { InventoryItemOperationsHistory } from './InventoryItemOperationsHistory'
import { HarvestFieldIncomesSummary } from './HarvestFieldIncomesSummary'
import { StockProgressBar } from './StockProgressBar'

type InventoryDetailSheetProps = {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
}

export function InventoryDetailSheet({ item, open, onClose }: InventoryDetailSheetProps) {
  const isMobile = useIsMobile(639)
  const { data: categories = [] } = useDictionary('inventory_category')
  const {
    data: operations = [],
    isLoading: operationsLoading,
    isError: operationsError,
  } = useInventoryItemOperations(item?.id ?? null, open)

  if (!item) return null

  const categoryLabel =
    categories.find((row) => row.code === item.category)?.name ?? getCategoryLabel(item.category)
  const harvest = isHarvestCategory(item.category) || item.isHarvest

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile
            ? 'max-h-[90vh] w-full overflow-y-auto rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))]'
            : 'w-full overflow-y-auto sm:max-w-md'
        }
      >
        {isMobile ? (
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
        ) : null}
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="size-5 text-primary" aria-hidden />
            {humanLabel(item.name, 'Товар')}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge
              variant="outline"
              className={harvest ? 'border-primary/40 bg-primary/5 text-primary' : undefined}
            >
              {categoryLabel}
            </Badge>
            {isCriticalStock(item) ? (
              <Badge variant="destructive">Критичный остаток</Badge>
            ) : (
              <Badge variant="secondary">В норме</Badge>
            )}
            <EntityHistoryButton entityType="inventory_item" entityId={item.id} />
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6 text-sm">
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
          <Row label="Статус позиции" value={item.isActive ? 'Активна' : 'Архив'} />
          {!item.isActive && item.archiveReason ? (
            <Row label="Причина архивации" value={item.archiveReason} />
          ) : null}
          {!item.isActive && item.archivedAt ? (
            <Row
              label="Архивирована"
              value={[
                new Date(item.archivedAt).toLocaleString('ru-RU'),
                item.archivedByName,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ) : null}
          {item.isActive && item.archiveReason ? (
            <Row
              label="Последняя архивация"
              value={[
                item.archiveReason,
                item.archivedAt
                  ? new Date(item.archivedAt).toLocaleString('ru-RU')
                  : null,
                item.archivedByName,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ) : null}

          {harvest ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Культура задаётся в карточке позиции; сбор — с поля; продажа — через заявку; KPI
              культур — в «Отгрузках урожая» (с опциональной связью с заявкой).
            </p>
          ) : null}

          <HarvestFieldIncomesSummary
            category={item.category}
            unit={item.unit}
            operations={operations}
          />

          <InventoryItemOperationsHistory
            operations={operations}
            unit={item.unit}
            isLoading={operationsLoading}
            isError={operationsError}
          />
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
