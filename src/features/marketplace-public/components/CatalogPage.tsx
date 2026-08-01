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

  // Sort applies to the current API page (server filters; no second catalog query).
  const items = useMemo(
    () => sortListings(listingsQuery.data?.items ?? [], sort),
    [listingsQuery.data?.items, sort],
  )

  const total = listingsQuery.data?.total ?? 0
  const pageSize = listingsQuery.data?.page_size ?? 24
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasActiveFilters = Boolean(debouncedQ || categoryId)
  const showResultsMeta = !listingsQuery.isLoading && !listingsQuery.isError

  const resetFilters = () => {
    setCategoryId(null)
    setSearchInput('')
    setDebouncedQ('')
    setSort('date_desc')
    setPage(1)
  }

  const emptyTitle = hasActiveFilters ? 'Ничего не найдено' : 'Пока нет объявлений'
  const emptyDescription = hasActiveFilters
    ? 'Измените поиск или категорию — или сбросьте фильтры.'
    : 'Хозяйства ещё не опубликовали товары. Загляните позже.'

  return (
    <MarketShell title="Витрина">
      <div className="space-y-5 sm:space-y-6">
        <header className="space-y-2 border-b border-border pb-5">
          <p className="text-[11px] font-medium tracking-[0.14em] text-primary uppercase">
            Доска объявлений
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Экопродукция от хозяйств
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Смотрите объявления и оставляйте заявку продавцу. Оплата и договорённости — напрямую с
            хозяйством, без входа в учёт КФХ.
          </p>
        </header>

        <CatalogToolbar
          categories={categoriesQuery.data ?? []}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          sort={sort}
          onSortChange={setSort}
        />

        {showResultsMeta ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? 'Нет объявлений по выбранным условиям'
                : `Найдено: ${total.toLocaleString('ru-RU')}`}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm font-medium text-primary hover:underline"
              >
                Сбросить фильтры
              </button>
            ) : null}
          </div>
        ) : null}

        {listingsQuery.isError ? (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">
              Не удалось загрузить каталог. Проверьте соединение и попробуйте снова.
            </p>
            <button
              type="button"
              onClick={() => void listingsQuery.refetch()}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
            >
              Повторить
            </button>
          </div>
        ) : null}

        <ListingGrid
          items={items}
          isLoading={listingsQuery.isLoading}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          onResetFilters={hasActiveFilters ? resetFilters : undefined}
        />

        {totalPages > 1 && !listingsQuery.isLoading && !listingsQuery.isError ? (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-10 disabled:opacity-40',
              )}
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
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-10 disabled:opacity-40',
              )}
            >
              Далее
            </button>
          </div>
        ) : null}
      </div>
    </MarketShell>
  )
}
