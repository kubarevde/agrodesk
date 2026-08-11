import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Building2, LifeBuoy, LogOut, Store } from 'lucide-react'
import { Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSuperadminSupportUnread } from '@/features/superadmin/hooks/useSupport'
import { logoutSuperAdmin } from '@/features/superadmin/utils'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/superadmin/dashboard', label: 'Организации', icon: Building2 },
  { to: '/superadmin/marketplace', label: 'Маркетплейс', icon: Store },
  { to: '/superadmin/support', label: 'Поддержка', icon: LifeBuoy },
] as const

export function SuperAdminLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { data: unread = 0 } = useSuperadminSupportUnread()

  const handleLogout = async () => {
    logoutSuperAdmin()
    await navigate({ to: '/superadmin/login' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/superadmin/dashboard"
              className="min-w-0 truncate text-base font-semibold text-primary sm:text-lg"
            >
              АгроДеск · Администрация
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => void handleLogout()}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Выход</span>
            </Button>
          </div>

          <nav
            className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap sm:items-center sm:gap-3"
            aria-label="Суперадмин"
          >
            {NAV.map(({ to, label, icon: Icon }) => {
              const active =
                pathname === to ||
                pathname === `${to}/` ||
                pathname.startsWith(`${to}/`)
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'relative inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm transition-colors sm:min-h-0 sm:justify-start sm:rounded-none sm:px-0',
                    active
                      ? 'bg-primary/10 font-medium text-foreground sm:bg-transparent'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:hover:bg-transparent',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{label}</span>
                  {to === '/superadmin/support' && unread > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-amber-600 px-1.5 text-xs font-semibold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
