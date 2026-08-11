import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { selectOptions } from '@/lib/selectOptions'
import { LabeledSelect } from '@/components/ui/labeled-select'

type CategoryFilterProps = {
  value: string
  onChange: (value: string) => void
}

function isHarvestAliasCode(code: string): boolean {
  const normalized = code.trim().toLowerCase()
  return (
    normalized === 'urozhay_na_sklade' ||
    normalized === 'urozhay' ||
    normalized === 'harvest_stock' ||
    normalized === 'harvest_warehouse'
  )
}

function isHarvestAliasName(name: string): boolean {
  const text = name
    .replace(/[()[\]«»""]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  return text === 'урожай на складе' || text === 'урожай'
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const isMobile = useIsMobile(639)
  const { data: categories = [] } = useDictionary('inventory_category')

  const filters = useMemo(() => {
    const visible = categories.filter((item) => {
      if (item.code === 'harvest') return true
      if (isHarvestAliasCode(item.code) || isHarvestAliasName(item.name)) return false
      return true
    })
    return [
      { id: 'all', label: 'Все' },
      ...visible.map((item) => ({ id: item.code, label: item.name })),
    ]
  }, [categories])

  const effectiveValue =
    value !== 'all' && !filters.some((f) => f.id === value) && isHarvestAliasCode(value)
      ? 'harvest'
      : value

  if (isMobile) {
    return (
      <LabeledSelect
        label="Категория"
        value={effectiveValue}
        options={selectOptions(filters.map((f) => ({ value: f.id, label: f.label })))}
        onValueChange={(next) => onChange(next || 'all')}
        placeholder="Категория"
        className="min-h-11"
      />
    )
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Категория склада">
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            'min-h-9 rounded-full border px-3 py-1.5 text-sm transition-colors',
            effectiveValue === filter.id
              ? 'border-primary bg-primary text-primary-foreground'
              : filter.id === 'harvest'
                ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-border bg-surface text-foreground hover:bg-muted',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
