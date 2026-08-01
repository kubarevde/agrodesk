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
  photos: z
    .array(z.string())
    .max(8, 'Не больше 8 фото на объявление'),
})

export type ListingFormValues = z.infer<typeof listingFormSchema>

export function listingFormPayload(values: ListingFormValues) {
  return {
    title: values.title,
    description: values.description || null,
    price: values.price,
    unit: values.unit,
    quantity_available: values.quantity_available,
    category_id: values.category_id || null,
    photos: values.photos,
  }
}

export function ListingFormFields({
  form,
  categories,
}: {
  form: UseFormReturn<ListingFormValues>
  categories: PublicCategoryNode[]
}) {
  const flatCats = flattenCategories(categories)
  const photos = form.watch('photos')

  return (
    <>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="title">
          Название
        </label>
        <input
          id="title"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          {...form.register('title')}
        />
        {form.formState.errors.title ? (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="category_id">
          Категория
        </label>
        <select
          id="category_id"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          {...form.register('category_id')}
        >
          <option value="">Не выбрана</option>
          {flatCats.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {'— '.repeat(cat.depth)}
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="price">
            Цена, ₽
          </label>
          <input
            id="price"
            type="number"
            step="any"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            {...form.register('price', { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="unit">
            Ед. изм.
          </label>
          <input
            id="unit"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            {...form.register('unit')}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="qty">
          Количество
        </label>
        <input
          id="qty"
          type="number"
          step="any"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          {...form.register('quantity_available', { valueAsNumber: true })}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="description">
          Описание
        </label>
        <textarea
          id="description"
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          {...form.register('description')}
        />
      </div>

      <div>
        <p className="mb-1 text-xs text-muted-foreground">Фото</p>
        <ImageUploader
          folder="marketplace"
          value={photos}
          onChange={(urls) => form.setValue('photos', urls, { shouldDirty: true })}
          maxFiles={8}
        />
      </div>
    </>
  )
}
