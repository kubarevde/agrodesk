import { cn } from '@/lib/utils'
import { useDictionary } from '@/features/dictionaries/hooks'

type CategoryFilterProps = {
  value: string
  onChange: (value: string) => void
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const { data: categories = [] } = useDictionary('inventory_category')

  const filters = [
    { id: 'all', label: 'Все' },
    ...categories.map((item) => ({ id: item.code, label: item.name })),
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
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
