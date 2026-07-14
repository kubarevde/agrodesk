import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncQueue } from '@/lib/sync'
import { cn } from '@/lib/utils'

export function SyncStatusIndicator() {
  const isOnline = useOnlineStatus()
  const { pendingCount, failedCount } = useSyncQueue()
  const isSynced = pendingCount === 0 && failedCount === 0

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <span className={cn(isOnline ? 'text-success' : 'text-muted-foreground')}>
        ● {isOnline ? 'Онлайн' : 'Офлайн'}
      </span>

      {pendingCount > 0 ? (
        <Badge className="border-transparent bg-amber-500/15 text-amber-700 hover:bg-amber-500/20">
          ⏳ {pendingCount}
        </Badge>
      ) : null}

      {failedCount > 0 ? (
        <Tooltip>
          <TooltipTrigger className="inline-flex cursor-help">
            <Badge variant="destructive">❌ {failedCount}</Badge>
          </TooltipTrigger>
          <TooltipContent>Ошибки синхронизации</TooltipContent>
        </Tooltip>
      ) : null}

      {isSynced ? (
        <span className="text-success" title="Данные синхронизированы" aria-label="Синхронизировано">
          ●
        </span>
      ) : null}
    </div>
  )
}
