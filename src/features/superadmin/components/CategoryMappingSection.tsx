import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCategoryMappings,
  useDeleteCategoryMapping,
  useUpsertCategoryMapping,
} from '../hooks/useMarketplace'
import type { AdminCategory } from '../marketplaceTypes'

/** Default inventory dictionary codes (org settings) — mapping keys, not FKs. */
const SUGGESTED_CODES = [
  'fuel',
  'fertilizer',
  'seeds',
  'parts',
  'chemicals',
  'harvest',
  'other',
]

export function CategoryMappingSection({ categories }: { categories: AdminCategory[] }) {
  const mappings = useCategoryMappings()
  const upsert = useUpsertCategoryMapping()
  const remove = useDeleteCategoryMapping()
  const [invCode, setInvCode] = useState('fuel')
  const [marketId, setMarketId] = useState('')

  const activeCats = categories.filter((c) => c.isActive)

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Связь со складом</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Код категории ТМЦ (словарь организации) → категория витрины. Таблицы раздельные:
          склад не меняется; при импорте код только читается.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="map-inv">
            Код ТМЦ
          </label>
          <input
            id="map-inv"
            list="inv-code-suggestions"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={invCode}
            onChange={(e) => setInvCode(e.target.value)}
            placeholder="fuel"
          />
          <datalist id="inv-code-suggestions">
            {SUGGESTED_CODES.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="map-mkt">
            Категория витрины
          </label>
          <select
            id="map-mkt"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
          >
            <option value="">Выберите…</option>
            {activeCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!invCode.trim() || !marketId || upsert.isPending}
          className="bg-primary text-primary-foreground"
          onClick={() =>
            upsert.mutate(
              {
                inventoryCategoryValue: invCode.trim(),
                marketCategoryId: marketId,
              },
              {
                onSuccess: () => setMarketId(''),
              },
            )
          }
        >
          Сохранить
        </Button>
      </div>

      {mappings.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : !mappings.data?.length ? (
        <p className="text-sm text-muted-foreground">Маппингов пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {mappings.data.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-foreground">
                <span className="font-medium">{row.inventoryCategoryValue}</span>
                <span className="text-muted-foreground"> → </span>
                {row.marketCategoryName ?? row.marketCategoryId}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => remove.mutate(row.id)}
              >
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
