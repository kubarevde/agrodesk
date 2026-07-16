import { AlertCircle, Clock3, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { queryClient } from '@/lib/queryClient'
import { flushSyncQueue, useSyncQueue } from '@/lib/sync'
import { cn } from '@/lib/utils'

export function SyncStatusIndicator() {
  const isOnline = useOnlineStatus()
  const { pendingCount, failedCount } = useSyncQueue()
  const [isSyncing, setIsSyncing] = useState(false)
  const isSynced = pendingCount === 0 && failedCount === 0

  const handleRetry = async () => {
    if (!isOnline || isSyncing) return
    setIsSyncing(true)
    try {
      const result = await flushSyncQueue({ includeFailed: true })
      await queryClient.invalidateQueries()
      if (result.synced > 0) {
        toast.success(`Синхронизировано: ${result.synced}`)
      } else if (result.failed > 0) {
        toast.error(`Ошибок синхронизации: ${result.failed}. Проверьте данные и повторите.`)
      } else if (pendingCount === 0 && failedCount === 0) {
        toast.message('Очередь пуста')
      } else {
        toast.message('Синхронизация выполнена')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <Tooltip>
        <TooltipTrigger className="inline-flex">
          <span className={cn(isOnline ? 'text-success' : 'text-muted-foreground')}>
            ● {isOnline ? 'Онлайн' : 'Офлайн'}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {isOnline
            ? 'Есть связь с сервером'
            : 'Нет сети. Изменения смен сохраняются локально и синхронизируются позже.'}
        </TooltipContent>
      </Tooltip>

      {pendingCount > 0 ? (
        <Tooltip>
          <TooltipTrigger className="inline-flex">
            <Badge className="gap-1 border-transparent bg-amber-500/15 text-amber-700 hover:bg-amber-500/20">
              <Clock3 className="size-3" aria-hidden />
              {pendingCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Ожидает синхронизации: {pendingCount} (сохранено локально)
          </TooltipContent>
        </Tooltip>
      ) : null}

      {failedCount > 0 ? (
        <Tooltip>
          <TooltipTrigger className="inline-flex cursor-help">
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="size-3" aria-hidden />
              {failedCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Ошибки синхронизации — нажмите «Повторить»</TooltipContent>
        </Tooltip>
      ) : null}

      {(pendingCount > 0 || failedCount > 0) && isOnline ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Повторить синхронизацию"
          disabled={isSyncing}
          onClick={() => void handleRetry()}
        >
          <RefreshCw className={cn('size-3.5', isSyncing && 'animate-spin')} />
        </Button>
      ) : null}

      {isSynced && isOnline ? (
        <span className="text-success" title="Данные синхронизированы" aria-label="Синхронизировано">
          ●
        </span>
      ) : null}
    </div>
  )
}
