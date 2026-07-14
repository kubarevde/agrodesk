import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrentUser, useLogout } from '@/features/auth/hooks'
import { ChangePasswordForm } from './ChangePasswordForm'
import { MyStatsSection } from './MyStatsSection'
import { ProfileInfoSection } from './ProfileInfoSection'

export function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser()
  const logout = useLogout()

  if (isLoading || !user) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Профиль</h1>
      <ProfileInfoSection user={user} />
      <ChangePasswordForm />
      {user.role === 'employee' ? <MyStatsSection user={user} /> : null}
      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={logout}>
        <LogOut className="size-4" />
        Выйти
      </Button>
    </div>
  )
}
