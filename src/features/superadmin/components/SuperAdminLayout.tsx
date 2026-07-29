import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { LifeBuoy, LogOut } from 'lucide-react'
import { Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSuperadminSupportUnread } from '@/features/superadmin/hooks/useSupport'
import { logoutSuperAdmin } from '@/features/superadmin/utils'

export function SuperAdminLayout() {
  const navigate = useNavigate()
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
            <Link to="/superadmin/dashboard" className="text-lg font-semibold text-primary">
              АгроДеск · Администрация
            </Link>
            <Link
              to="/superadmin/support"
              className="relative inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LifeBuoy className="size-4" />
              Поддержка
              {unread > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </Link>
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
