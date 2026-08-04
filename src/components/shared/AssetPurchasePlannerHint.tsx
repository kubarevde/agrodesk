import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { usePurchaseItems } from '@/features/purchase-planner/hooks'
import { purchasePlannerSearch } from '@/features/purchase-planner/lib/plannerSearch'
import { cn } from '@/lib/utils'

type AssetPurchasePlannerHintProps = {
  equipmentId?: string
  implementId?: string
  /** Stop parent card click when interacting with the link. */
  stopPropagation?: boolean
  linkLabel?: string
  className?: string
}

export function plannedPositionsLabel(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return `${count} позиций в планировщике`
  if (mod10 === 1) return `${count} позиция в планировщике`
  if (mod10 >= 2 && mod10 <= 4) return `${count} позиции в планировщике`
  return `${count} позиций в планировщике`
}

/**
 * Lightweight read-only summary of open purchase-planner items for an asset.
 * Does not embed planner UI — only count + deep link.
 */
export function AssetPurchasePlannerHint({
  equipmentId,
  implementId,
  stopPropagation = true,
  linkLabel,
  className,
}: AssetPurchasePlannerHintProps) {
  const enabled = Boolean(equipmentId || implementId)
  const { data: items = [], isLoading } = usePurchaseItems(
    { status: 'planned', equipmentId, implementId },
    enabled,
  )

  if (!enabled || isLoading || items.length === 0) return null

  const search = purchasePlannerSearch({
    mode: 'checklist',
    equipmentId,
    implementId,
  })

  const defaultLink = implementId
    ? 'Смотреть закупки для этого приспособления'
    : 'Смотреть закупки для этой техники'

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2',
        className,
      )}
      data-testid="asset-purchase-planner-hint"
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      onKeyDown={stopPropagation ? (event) => event.stopPropagation() : undefined}
    >
      <p className="flex items-center gap-1.5 text-sm text-foreground">
        <ShoppingCart className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        {plannedPositionsLabel(items.length)}
      </p>
      <Link
        to="/purchase-planner"
        search={search}
        className="text-sm text-primary hover:underline"
      >
        {linkLabel ?? defaultLink}
      </Link>
    </div>
  )
}
