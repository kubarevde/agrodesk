import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { logoutSuperAdmin } from '@/features/superadmin/utils'

export function SuperAdminLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    logoutSuperAdmin()
    await navigate({ to: '/superadmin/login' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/superadmin/dashboard" className="text-lg font-semibold text-primary">
            АгроДеск · Администрация
          </Link>
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
