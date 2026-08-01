import { flattenCategories } from '../lib'
import type { CatalogSort, PublicCategoryNode } from '../types'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'date_desc', label: 'Сначала новые' },
  { value: 'date_asc', label: 'Сначала старые' },
  { value: 'price_asc', label: 'Цена ↑' },
  { value: 'price_desc', label: 'Цена ↓' },
]

export function CatalogToolbar({
  categories,
  categoryId,
  onCategoryChange,
  searchInput,
  onSearchInputChange,
  sort,
  onSortChange,
}: {
  categories: PublicCategoryNode[]
  categoryId: string | null
  onCategoryChange: (id: string | null) => void
  searchInput: string
  onSearchInputChange: (value: string) => void
  sort: CatalogSort
  onSortChange: (sort: CatalogSort) => void
}) {
  const flat = flattenCategories(categories)

  return (
    <div className="space-y-3" data-testid="catalog-toolbar">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="market-search">
          Поиск
        </label>
        <input
          id="market-search"
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Поиск по названию…"
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9 sm:flex-1 sm:text-sm"
        />
        <label className="sr-only" htmlFor="market-sort">
          Сортировка
        </label>
        <select
          id="market-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as CatalogSort)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground sm:h-9 sm:w-44"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="listbox" aria-label="Категории">
        <button
          type="button"
          role="option"
          aria-selected={categoryId === null}
          onClick={() => onCategoryChange(null)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            categoryId === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:text-foreground',
          )}
        >
          Все
        </button>
        {flat.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="option"
            aria-selected={categoryId === cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              categoryId === cat.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            {cat.depth > 0 ? `${'·'.repeat(cat.depth)} ` : ''}
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  )
}
