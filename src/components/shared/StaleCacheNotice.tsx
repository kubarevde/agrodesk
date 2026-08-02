import { HardDrive } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type StaleCacheNoticeProps = {
  /** Extra context for the section (optional). */
  detail?: string
  className?: string
}

/**
 * Shown when the device is offline but the screen still shows Dexie/local data.
 * Honest: these rows may be outdated until the next successful online fetch.
 */
export function StaleCacheNotice({
  detail = 'Показаны данные с устройства — они могут быть устаревшими.',
  className,
}: StaleCacheNoticeProps) {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div
      role="status"
      data-testid="stale-cache-notice"
      className={
        className ??
        'flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground'
      }
    >
      <HardDrive className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{detail}</p>
    </div>
  )
}
