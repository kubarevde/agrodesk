import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { purchasePlannerSearch } from '../lib/plannerSearch'
import type { PlannerSearchFilters } from '../lib/plannerFilterContext'
import { usePlannerFilterContext } from '../lib/plannerFilterContext'

type PurchasePlannerFilterBannerProps = {
  filters: PlannerSearchFilters
  mode?: 'checklist' | 'manage'
}

export function PurchasePlannerFilterBanner({
  filters,
  mode,
}: PurchasePlannerFilterBannerProps) {
  const ctx = usePlannerFilterContext(filters)

  if (!ctx.hasFilter || !ctx.bannerText) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <p className="text-sm text-foreground">{ctx.bannerText}</p>
      <Link
        to="/purchase-planner"
        search={purchasePlannerSearch({ mode: mode === 'checklist' ? 'checklist' : undefined })}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-primary hover:bg-muted/30"
      >
        <X className="size-3.5" />
        Сбросить фильтр
      </Link>
    </div>
  )
}
