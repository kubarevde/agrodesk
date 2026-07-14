import { Download, Menu } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { useLayoutStore } from '@/stores/layoutStore'
import { getPageTitle } from './navigation'
import { SyncStatusIndicator } from './SyncStatusIndicator'

function getInitials(fullName?: string): string {
  if (!fullName) return 'AD'
  const parts = fullName.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AD'
}

export function AppHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const setMobileMenuOpen = useLayoutStore((state) => state.setMobileMenuOpen)
  const pageTitle = getPageTitle(pathname)
  const { canInstall, install } = usePwaInstall()
  const { data: user } = useCurrentUser()

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

      <div className="flex items-center justify-center gap-2">
        <SyncStatusIndicator />
        <NotificationBell />
      </div>

      <div className="flex items-center justify-end gap-2">
        {canInstall ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void install()}>
            <Download className="size-4" />
            <span className="hidden sm:inline">Установить приложение</span>
          </Button>
        ) : null}
        <Link to="/profile" aria-label="Профиль">
          <Avatar className="size-9 bg-primary">
            <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
              {getInitials(user?.fullName)}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
