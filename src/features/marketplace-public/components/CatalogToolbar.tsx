import { Search, X } from 'lucide-react'
import { flattenCategories } from '../lib'
import type { CatalogSort, PublicCategoryNode } from '../types'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'date_desc', label: 'Сначала новые' },
  { value: 'date_asc', label: 'Сначала старые' },
  { value: 'price_asc', label: 'Дешевле' },
  { value: 'price_desc', label: 'Дороже' },
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
  const hasSearch = searchInput.trim().length > 0

  return (
    <div className="space-y-3" data-testid="catalog-toolbar">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label className="sr-only" htmlFor="market-search">
            Поиск
          </label>
          <input
            id="market-search"
            type="search"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder="Поиск по названию…"
            className="h-11 w-full rounded-lg border border-input bg-background py-2 pr-10 pl-9 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:text-sm"
          />
          {hasSearch ? (
            <button
              type="button"
              onClick={() => onSearchInputChange('')}
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Очистить поиск"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <label className="sr-only" htmlFor="market-sort">
          Сортировка
        </label>
        <select
          id="market-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as CatalogSort)}
          className="h-11 w-full shrink-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground sm:h-10 sm:w-44"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]"
        role="listbox"
        aria-label="Категории"
      >
        <button
          type="button"
          role="option"
          aria-selected={categoryId === null}
          onClick={() => onCategoryChange(null)}
          className={cn(
            'min-h-9 shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
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
              'min-h-9 shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
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
