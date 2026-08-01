import { useEffect, useMemo, useState } from 'react'
import { usePublicCategories, usePublicListings } from '../hooks'
import { sortListings } from '../lib'
import type { CatalogSort } from '../types'
import { CatalogToolbar } from './CatalogToolbar'
import { ListingGrid } from './ListingGrid'
import { MarketShell } from './MarketShell'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CatalogPage() {
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [sort, setSort] = useState<CatalogSort>('date_desc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 300)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [categoryId, debouncedQ])

  useEffect(() => {
    document.title = 'Экопродукция — витрина хозяйств | АгроДеск'
  }, [])

  const categoriesQuery = usePublicCategories()
  const listingsQuery = usePublicListings({
    categoryId,
    q: debouncedQ,
    page,
  })

  const items = useMemo(
    () => sortListings(listingsQuery.data?.items ?? [], sort),
    [listingsQuery.data?.items, sort],
  )

  const total = listingsQuery.data?.total ?? 0
  const pageSize = listingsQuery.data?.page_size ?? 24
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const resetFilters = () => {
    setCategoryId(null)
    setSearchInput('')
    setDebouncedQ('')
    setSort('date_desc')
    setPage(1)
  }

  const emptyTitle = debouncedQ || categoryId ? 'Ничего не найдено' : 'Пока нет товаров'
  const emptyDescription = debouncedQ || categoryId
    ? 'Измените поиск или категорию — или сбросьте фильтры.'
    : 'Хозяйства ещё не опубликовали объявления. Загляните позже.'

  return (
    <MarketShell title="Витрина">
      <div className="space-y-5 sm:space-y-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
            Экопродукция
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Витрина от хозяйств
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground sm:text-base">
            Покупайте напрямую у производителей. Вход в учёт КФХ здесь не нужен.
          </p>
        </div>

        <CatalogToolbar
          categories={categoriesQuery.data ?? []}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          sort={sort}
          onSortChange={setSort}
        />

        {listingsQuery.isError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Не удалось загрузить каталог. Проверьте соединение и обновите страницу.
          </p>
        ) : null}

        <ListingGrid
          items={items}
          isLoading={listingsQuery.isLoading}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          onResetFilters={debouncedQ || categoryId ? resetFilters : undefined}
        />

        {totalPages > 1 && !listingsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'disabled:opacity-40')}
            >
              Назад
            </button>
            <span className="text-sm tabular-nums text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'disabled:opacity-40')}
            >
              Далее
            </button>
          </div>
        ) : null}
      </div>
    </MarketShell>
  )
}
