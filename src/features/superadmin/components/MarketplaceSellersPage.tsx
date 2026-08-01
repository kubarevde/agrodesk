import { useMemo, useState } from 'react'
import { Store } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { useOrganizations } from '../hooks'
import { useAdminSellers, useUpdateSeller } from '../hooks/useMarketplace'
import { MarketplaceShell } from './MarketplaceShell'

export function MarketplaceSellersPage() {
  const [orgId, setOrgId] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'blocked' | 'verified'>('all')
  const orgs = useOrganizations()
  const sellers = useAdminSellers(orgId || undefined)
  const update = useUpdateSeller()

  const filtered = useMemo(() => {
    const rows = sellers.data ?? []
    return rows.filter((s) => {
      if (status === 'active') return s.isActive
      if (status === 'blocked') return !s.isActive
      if (status === 'verified') return s.isVerified
      return true
    })
  }, [sellers.data, status])

  return (
    <MarketplaceShell
      title="Продавцы"
      description="Магазины платформы: значок «проверенный» и блокировка витрины."
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          aria-label="Фильтр по организации"
        >
          <option value="">Все организации</option>
          {(orgs.data ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="Фильтр по статусу"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
          <option value="verified">Проверенные</option>
        </select>
      </div>

      {sellers.isLoading ? (
        <PageSkeleton />
      ) : !filtered.length ? (
        <EmptyState
          icon={Store}
          title="Продавцов нет"
          description="Измените фильтры или дождитесь регистрации магазинов."
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {s.displayName}
                  {s.isVerified ? (
                    <span className="ml-2 text-xs text-[color:var(--success)]">проверен</span>
                  ) : null}
                  {!s.isActive ? (
                    <span className="ml-2 text-xs text-destructive">заблокирован</span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {s.orgName} · на витрине: {s.publishedListings}
                  {s.phone ? ` · ${s.phone}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate({
                      id: s.id,
                      payload: { isVerified: !s.isVerified },
                    })
                  }
                >
                  {s.isVerified ? 'Снять проверку' : 'Проверенный'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={s.isActive ? 'destructive' : 'outline'}
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate({
                      id: s.id,
                      payload: { isActive: !s.isActive },
                    })
                  }
                >
                  {s.isActive ? 'Заблокировать' : 'Разблокировать'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MarketplaceShell>
  )
}
