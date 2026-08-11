import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RegionSelect } from '@/components/shared/RegionSelect'
import { Button } from '@/components/ui/button'
import { OrganizationsCards } from '@/features/superadmin/components/OrganizationsCards'
import { orgPlanLabel } from '@/features/superadmin/plans'
import type { Organization } from '@/features/superadmin/types'
import { regionLabel } from '@/lib/regions.ru'
import { cn } from '@/lib/utils'

type OrganizationsListProps = {
  organizations: Organization[]
  onEdit: (org: Organization) => void
  onToggleActive: (org: Organization) => void
  onDelete: (org: Organization) => void
  onCreate: () => void
}

function matchesSearch(org: Organization, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    org.name,
    org.slug,
    org.ownerEmail ?? '',
    orgPlanLabel(org.plan),
    regionLabel(org.region),
    org.region ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function OrganizationsList({
  organizations,
  onEdit,
  onToggleActive,
  onDelete,
  onCreate,
}: OrganizationsListProps) {
  const [regionFilter, setRegionFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      if (regionFilter && org.region !== regionFilter) return false
      return matchesSearch(org, search)
    })
  }, [organizations, regionFilter, search])

  const hasSearch = search.trim().length > 0
  const filtersActive = Boolean(regionFilter) || hasSearch

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
          <Button
            type="button"
            variant={regionFilter == null ? 'default' : 'outline'}
            className={cn(
              'h-10 shrink-0',
              regionFilter == null && 'bg-primary text-primary-foreground',
            )}
            onClick={() => setRegionFilter(null)}
          >
            Все
          </Button>
          <RegionSelect
            className="h-10 min-w-0 flex-1"
            value={regionFilter}
            onValueChange={setRegionFilter}
            includeEmpty={false}
            placeholder="Регион"
          />
        </div>

        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label className="sr-only" htmlFor="orgs-search">
            Поиск организаций
          </label>
          <input
            id="orgs-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по названию, адресу, владельцу…"
            className="h-10 w-full rounded-lg border border-input bg-background py-2 pr-10 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {hasSearch ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Очистить поиск"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-4 py-8">
          <p className="text-sm text-muted-foreground">
            {filtersActive
              ? 'Ничего не найдено. Сбросьте фильтр или измените поиск.'
              : 'Организаций пока нет'}
          </p>
          {filtersActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRegionFilter(null)
                setSearch('')
              }}
            >
              Сбросить фильтры
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onCreate}>
              Создать первую
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Показано {filtered.length} из {organizations.length}
          </p>
          <OrganizationsCards
            organizations={filtered}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
          />
        </>
      )}
    </div>
  )
}
