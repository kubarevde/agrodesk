import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncQueue } from '@/lib/sync'

/** Compact banner when the device is offline — clarifies local-save behaviour. */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const { pendingCount } = useSyncQueue()

  if (isOnline) return null

  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-border bg-muted/60 px-4 py-2 text-sm text-foreground"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">Нет сети — режим офлайн</p>
        <p className="text-xs text-muted-foreground">
          Смены: открытие и закрытие сохраняются локально
          {pendingCount > 0 ? ` (в очереди: ${pendingCount})` : ''} и уйдут на сервер при появлении
          интернета. Дашборд, отчёты, затраты и отгрузки — только онлайн.
        </p>
      </div>
    </div>
  )
}
