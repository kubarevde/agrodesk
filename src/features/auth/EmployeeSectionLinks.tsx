import { Link } from '@tanstack/react-router'
import { useCurrentUser } from '@/features/auth/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { getNavItems } from '@/components/layout/navigation'

/** Quick links on employee home — same permission filter as sidebar/mobile. */
export function EmployeeSectionLinks() {
  const { data: user } = useCurrentUser()
  const { data: perms, isPending } = useUserPermissions(Boolean(user))

  if (!user || user.role !== 'employee') return null

  if (isPending && !perms) {
    return (
      <div className="grid grid-cols-2 gap-2" aria-busy="true" aria-label="Загрузка разделов">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xl border border-border bg-muted/40" />
        ))}
      </div>
    )
  }

  const items = getNavItems(user.role, perms?.allowedSections).filter(
    (item) => item.to !== '/my-shift',
  )

  if (items.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Доступные разделы</h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-muted/40"
          >
            <Icon className="size-5 text-primary" aria-hidden />
            <span className="font-medium text-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
