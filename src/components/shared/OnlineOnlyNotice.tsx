import { WifiOff } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'

type OnlineOnlyNoticeProps = {
  title?: string
  description?: string
  /** When true, render nothing if online */
  hideWhenOnline?: boolean
}

/**
 * Honest empty/fallback for screens that require live API (dashboard, reports, etc.).
 */
export function OnlineOnlyNotice({
  title = 'Раздел доступен только онлайн',
  description = 'Подключитесь к интернету, чтобы загрузить актуальные данные. Смены можно вести офлайн в разделе «Рабочее время».',
  hideWhenOnline = true,
}: OnlineOnlyNoticeProps) {
  const isOnline = useOnlineStatus()
  if (hideWhenOnline && isOnline) return null

  return (
    <div
      role="status"
      className="flex flex-col items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-5"
    >
      <div className="flex items-start gap-3">
        <WifiOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Link to="/worktime" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
        Открыть смены (офлайн)
      </Link>
    </div>
  )
}
