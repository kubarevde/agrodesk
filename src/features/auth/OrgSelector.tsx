import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { RegionSelect } from '@/components/shared/RegionSelect'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { usePublicOrgs } from '@/features/auth/hooks'
import type { SelectedOrg } from '@/features/auth/selectedOrg'
import { regionLabel } from '@/lib/regions.ru'
import { cn } from '@/lib/utils'

type OrgSelectorProps = {
  value: SelectedOrg | null
  onChange: (org: SelectedOrg) => void
  onContinue: () => void
}

export function OrgSelector({ value, onChange, onContinue }: OrgSelectorProps) {
  const orgsQuery = usePublicOrgs()
  const orgs = orgsQuery.data ?? []
  const [regionFilter, setRegionFilter] = useState<string | null>(null)
  // Local pick survives parent re-render lag (e2e / Strict Mode).
  const [pickedId, setPickedId] = useState<string | null>(value?.id ?? null)

  useEffect(() => {
    setPickedId(value?.id ?? null)
  }, [value?.id])

  const filtered = useMemo(() => {
    if (!regionFilter) return orgs
    return orgs.filter((org) => org.region === regionFilter)
  }, [orgs, regionFilter])

  useEffect(() => {
    if (!pickedId) return
    if (!filtered.some((org) => org.id === pickedId)) {
      setPickedId(null)
    }
  }, [filtered, pickedId])

  const canContinue = Boolean(pickedId && filtered.some((org) => org.id === pickedId))

  if (orgsQuery.isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        Загрузка организаций…
      </div>
    )
  }

  if (orgsQuery.isError) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-destructive">
          Не удалось загрузить организации. Проверьте, что QA/API доступен
          (прокси Vite → VITE_API_PROXY_TARGET, обычно http://127.0.0.1:8001).
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void orgsQuery.refetch()}
        >
          <RefreshCw className="size-4" />
          Повторить
        </Button>
      </div>
    )
  }

  if (orgs.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          Нет доступных организаций. Запустите seed: <code>python -m app.seed</code>
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void orgsQuery.refetch()}
        >
          <RefreshCw className="size-4" />
          Обновить
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <RegionSelect
        label="Регион"
        value={regionFilter}
        onValueChange={setRegionFilter}
        emptyLabel="Все регионы"
        placeholder="Все регионы"
      />

      <div className="space-y-2">
        <Label>Организация</Label>
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-3 py-3 text-sm text-muted-foreground">
            Нет организаций в выбранном регионе. Выберите «Все регионы» или другой регион.
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto" role="listbox" aria-label="Организации">
            {filtered.map((org) => {
              const selected = pickedId === org.id
              return (
                <li key={org.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      'flex w-full flex-col items-start gap-0.5 rounded-xl border px-3 py-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border bg-surface hover:border-primary/40',
                    )}
                    onClick={() => {
                      setPickedId(org.id)
                      onChange(org)
                    }}
                  >
                    <span className="font-medium">{org.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {org.slug}
                      {org.region ? ` · ${regionLabel(org.region)}` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <Button
        type="button"
        className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
        disabled={!canContinue}
        onClick={onContinue}
      >
        Продолжить
      </Button>
    </div>
  )
}
