import { z } from 'zod'
import type { UseFormReturn } from 'react-hook-form'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { flattenCategories } from '@/features/marketplace-public/lib'
import type { PublicCategoryNode } from '../types'

export const listingFormSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название').max(200),
  description: z.string().max(10000).optional(),
  price: z.number().min(0),
  unit: z.string().trim().min(1, 'Укажите единицу').max(40),
  quantity_available: z.number().min(0),
  category_id: z.string().optional(),
  photos: z.array(z.string()).max(8, 'Не больше 8 фото на объявление'),
})

export type ListingFormValues = z.infer<typeof listingFormSchema>

export type ListingWritePayload = {
  title: string
  description: string | null
  price: number
  unit: string
  category_id: string | null
  photos: string[]
  quantity_available?: number
}

export function listingFormPayload(
  values: ListingFormValues,
  options?: { omitQuantity?: boolean },
): ListingWritePayload {
  const base: ListingWritePayload = {
    title: values.title,
    description: values.description || null,
    price: values.price,
    unit: values.unit,
    category_id: values.category_id || null,
    photos: values.photos,
  }
  if (options?.omitQuantity) return base
  return { ...base, quantity_available: values.quantity_available }
}

const fieldClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function ListingFormFields({
  form,
  categories,
  quantityLinked = false,
  sourceMissing = false,
}: {
  form: UseFormReturn<ListingFormValues>
  categories: PublicCategoryNode[]
  /** Source-linked: qty is live from warehouse/shipment (read-only). */
  quantityLinked?: boolean
  sourceMissing?: boolean
}) {
  const flatCats = flattenCategories(categories)
  const photos = form.watch('photos')
  const title = form.watch('title')
  const price = form.watch('price')
  const unit = form.watch('unit')
  const qty = form.watch('quantity_available')

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Основное</h3>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="title">
            Название
          </label>
          <input id="title" className={fieldClass} {...form.register('title')} />
          {form.formState.errors.title ? (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.title.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="category_id">
            Категория витрины
          </label>
          <select id="category_id" className={fieldClass} {...form.register('category_id')}>
            <option value="">Не выбрана</option>
            {flatCats.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {'— '.repeat(cat.depth)}
                {cat.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Нужна для отправки на модерацию. Это категория витрины, не справочник склада.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Цена и остаток на витрине</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="price">
              Цена, ₽
            </label>
            <input
              id="price"
              type="number"
              step="any"
              className={fieldClass}
              {...form.register('price', { valueAsNumber: true })}
            />
            <p className="mt-1 text-xs text-muted-foreground">За одну единицу измерения.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="unit">
              Ед. изм.
            </label>
            <input id="unit" className={fieldClass} {...form.register('unit')} />
            <p className="mt-1 text-xs text-muted-foreground">кг, л, шт…</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="qty">
            {quantityLinked ? 'Доступно сейчас' : 'Количество в объявлении'}
          </label>
          <input
            id="qty"
            type="number"
            step="any"
            className={fieldClass}
            readOnly={quantityLinked}
            disabled={quantityLinked}
            {...form.register('quantity_available', { valueAsNumber: true })}
          />
          {quantityLinked ? (
            <p className="mt-1 text-xs text-muted-foreground" data-testid="qty-source-hint">
              Количество синхронизируется с источником (склад или отгрузка). Здесь только просмотр —
              правьте остаток в источнике. Заявка со витрины склад не списывает.
              {sourceMissing
                ? ' Источник недоступен: на витрине будет «нет в наличии».'
                : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Показывается покупателю. Правьте вручную — автоматического списания склада нет.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Описание и фото</h3>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="description">
            Описание
          </label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...form.register('description')}
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-muted-foreground">Фото (до 8)</p>
          <ImageUploader
            folder="marketplace"
            value={photos}
            onChange={(urls) => form.setValue('photos', urls, { shouldDirty: true })}
            maxFiles={8}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Для модерации нужно хотя бы одно фото. Используйте тот же загрузчик, что и в остальном
            приложении (`folder=marketplace`).
          </p>
        </div>
      </section>

      {/* Lightweight preview — not a copy of public ListingCard */}
      <section
        className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-3"
        data-testid="listing-form-preview"
      >
        <p className="text-xs font-medium text-muted-foreground">Краткий превью для продавца</p>
        <p className="mt-1 truncate text-sm font-medium text-foreground">
          {title.trim() || 'Название объявления'}
        </p>
        <p className="text-sm tabular-nums text-primary">
          {Number.isFinite(price) ? `${price.toLocaleString('ru-RU')} ₽` : '— ₽'}
          {unit ? ` / ${unit}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          Кол-во: {Number.isFinite(qty) ? qty.toLocaleString('ru-RU') : '—'}
          {unit ? ` ${unit}` : ''} · фото: {photos.length}
        </p>
      </section>
    </div>
  )
}
