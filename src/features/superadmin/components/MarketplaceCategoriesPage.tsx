import { useState } from 'react'
import { FolderTree, Plus } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
} from '../hooks/useMarketplace'
import type { AdminCategory } from '../marketplaceTypes'
import { CategoryFormDialog } from './CategoryFormDialog'
import { CategoryMappingSection } from './CategoryMappingSection'
import { MarketplaceShell } from './MarketplaceShell'

export function MarketplaceCategoriesPage() {
  const cats = useAdminCategories()
  const createMut = useCreateCategory()
  const updateMut = useUpdateCategory()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<AdminCategory | null>(null)

  const items = [...(cats.data ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'),
  )
  const byId = new Map(items.map((c) => [c.id, c]))

  return (
    <MarketplaceShell
      title="Категории"
      description="Дерево категорий витрины. Неактивные скрыты на публичной витрине."
    >
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="bg-primary text-primary-foreground"
          onClick={() => {
            setEdit(null)
            setOpen(true)
          }}
        >
          <Plus className="mr-1.5 size-4" aria-hidden />
          Создать
        </Button>
      </div>

      {cats.isLoading ? (
        <PageSkeleton />
      ) : !items.length ? (
        <EmptyState
          icon={FolderTree}
          title="Категорий пока нет"
          description="Создайте первую категорию для витрины."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((c) => {
            const parent = c.parentId ? byId.get(c.parentId) : null
            return (
              <li
                key={c.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {c.name}
                    {!c.isActive ? (
                      <span className="ml-2 text-xs text-muted-foreground">(скрыта)</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {c.slug} · sort {c.sortOrder}
                    {parent ? ` · в «${parent.name}»` : ' · корень'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEdit(c)
                      setOpen(true)
                    }}
                  >
                    Изменить
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={updateMut.isPending}
                    onClick={() =>
                      updateMut.mutate({
                        id: c.id,
                        payload: { isActive: !c.isActive },
                      })
                    }
                  >
                    {c.isActive ? 'Скрыть' : 'Показать'}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <CategoryMappingSection categories={items} />

      <CategoryFormDialog
        open={open}
        onOpenChange={setOpen}
        categories={items}
        initial={edit}
        pending={createMut.isPending || updateMut.isPending}
        onSubmit={(values) => {
          const payload = {
            name: values.name,
            slug: values.slug,
            parentId: values.parentId || null,
            sortOrder: values.sortOrder,
            isActive: values.isActive,
          }
          if (edit) {
            updateMut.mutate({ id: edit.id, payload }, { onSuccess: () => setOpen(false) })
          } else {
            createMut.mutate(payload, { onSuccess: () => setOpen(false) })
          }
        }}
      />
    </MarketplaceShell>
  )
}
