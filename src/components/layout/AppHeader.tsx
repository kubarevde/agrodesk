import { Download, Menu } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { useSyncQueue } from '@/lib/sync'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layoutStore'
import { getPageTitle } from './navigation'

export function AppHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isOnline = useOnlineStatus()
  const { pendingCount: syncCount } = useSyncQueue()
  const setMobileMenuOpen = useLayoutStore((state) => state.setMobileMenuOpen)
  const pageTitle = getPageTitle(pathname)
  const { canInstall, install } = usePwaInstall()

  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-header-border bg-surface px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Открыть меню"
        >
          <Menu className="size-5" />
        </Button>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm">
        <span className={cn(isOnline ? 'text-success' : 'text-muted-foreground')}>
          ● {isOnline ? 'Онлайн' : 'Офлайн'}
        </span>
        {syncCount > 0 ? <Badge variant="destructive">{syncCount}</Badge> : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        {canInstall ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void install()}>
            <Download className="size-4" />
            <span className="hidden sm:inline">Установить приложение</span>
          </Button>
        ) : null}
        <Avatar className="size-9 bg-primary">
          <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
            AD
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
