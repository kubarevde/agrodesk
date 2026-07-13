import { cn } from '@/lib/utils'
import type { InventoryCategoryFilter } from '@/features/inventory/utils'
import { CATEGORY_FILTERS } from '@/features/inventory/utils'

interface CategoryFilterProps {
  value: InventoryCategoryFilter
  onChange: (value: InventoryCategoryFilter) => void
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm transition-colors',
            value === filter.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-surface text-foreground hover:bg-muted',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
