import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { slugify } from '../utils'
import type { AdminCategory } from '../marketplaceTypes'

const schema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(120),
  slug: z.string().trim().min(1, 'Укажите slug').max(120),
  parentId: z.string().optional(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
})

export type CategoryFormValues = z.infer<typeof schema>

export function CategoryFormDialog({
  open,
  onOpenChange,
  categories,
  initial,
  onSubmit,
  pending,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: AdminCategory[]
  initial: AdminCategory | null
  onSubmit: (values: CategoryFormValues) => void
  pending: boolean
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      parentId: '',
      sortOrder: 0,
      isActive: true,
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      initial
        ? {
            name: initial.name,
            slug: initial.slug,
            parentId: initial.parentId ?? '',
            sortOrder: initial.sortOrder,
            isActive: initial.isActive,
          }
        : { name: '', slug: '', parentId: '', sortOrder: 0, isActive: true },
    )
  }, [open, initial, form])

  const parents = categories.filter((c) => !initial || c.id !== initial.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Редактировать категорию' : 'Новая категория'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="cat-name">
              Название
            </label>
            <input
              id="cat-name"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              {...form.register('name')}
              onChange={(e) => {
                form.setValue('name', e.target.value, { shouldDirty: true })
                if (!initial) form.setValue('slug', slugify(e.target.value))
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="cat-slug">
              Slug
            </label>
            <input
              id="cat-slug"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              {...form.register('slug')}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="cat-parent">
              Родитель
            </label>
            <select
              id="cat-parent"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              {...form.register('parentId')}
            >
              <option value="">Корневая</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="cat-sort">
                Порядок (sort_order)
              </label>
              <input
                id="cat-sort"
                type="number"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                {...form.register('sortOrder', { valueAsNumber: true })}
              />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" {...form.register('isActive')} />
              Активна
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
