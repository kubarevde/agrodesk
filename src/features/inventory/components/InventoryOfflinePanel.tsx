import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useInventoryQueueIssues,
  useRetryInventoryQueueItem,
} from '@/features/inventory/hooks'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const TYPE_LABEL: Record<string, string> = {
  income: 'Приход',
  expense: 'Расход',
  adjustment: 'Корректировка',
}

/** Lists inventory queue rows in error/conflict with per-row retry. */
export function InventoryOfflinePanel() {
  const issues = useInventoryQueueIssues()
  const retry = useRetryInventoryQueueItem()
  const online = useOnlineStatus()

  if (issues.length === 0) return null

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <p className="font-medium text-foreground">
        Операции склада требуют проверки ({issues.length})
      </p>
      <ul className="space-y-2">
        {issues.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-background/80 px-3 py-2"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <AlertTriangle className="size-3.5 shrink-0 text-amber-700" aria-hidden />
                {TYPE_LABEL[row.type] ?? row.type}
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {row.status === 'conflict' ? 'конфликт' : 'ошибка'}
                </span>
              </p>
              {row.lastError ? (
                <p className="text-xs text-muted-foreground">{row.lastError}</p>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={!online || retry.isPending}
              onClick={() => retry.mutate(row.id)}
            >
              <RefreshCw className="size-3.5" />
              Повторить
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
