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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/superadmin/dashboard" className="shrink-0 text-lg font-semibold text-primary">
              АгроДеск · Администрация
            </Link>
            <nav className="flex flex-wrap items-center gap-3" aria-label="Суперадмин">
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
                      'relative inline-flex items-center gap-1.5 text-sm transition-colors',
                      active
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                    {to === '/superadmin/support' && unread > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </nav>
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
            <LogOut className="size-4" />
            Выход
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
