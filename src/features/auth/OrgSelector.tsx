import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { usePublicOrgs } from '@/features/auth/hooks'
import type { SelectedOrg } from '@/features/auth/selectedOrg'
import { cn } from '@/lib/utils'

type OrgSelectorProps = {
  value: SelectedOrg | null
  onChange: (org: SelectedOrg) => void
  onContinue: () => void
}

export function OrgSelector({ value, onChange, onContinue }: OrgSelectorProps) {
  const orgsQuery = usePublicOrgs()
  const orgs = orgsQuery.data ?? []

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
          Не удалось загрузить организации. Проверьте, что API доступен на
          http://localhost:8000
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
      <div className="space-y-2">
        <Label>Организация</Label>
        <ul className="max-h-64 space-y-2 overflow-y-auto" role="listbox" aria-label="Организации">
          {orgs.map((org) => {
            const selected = value?.id === org.id
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
                  onClick={() => onChange(org)}
                >
                  <span className="font-medium">{org.name}</span>
                  <span className="text-xs text-muted-foreground">{org.slug}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <Button
        type="button"
        className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
        disabled={!value}
        onClick={onContinue}
      >
        Продолжить
      </Button>
    </div>
  )
}
