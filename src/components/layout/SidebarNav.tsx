import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCurrentUser } from '@/features/auth/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { getNavGroups } from './navigation'

interface SidebarNavProps {
  collapsed: boolean
  onNavigate?: () => void
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions(Boolean(user))
  const navGroups = getNavGroups(user?.role, perms?.allowedSections)

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-1">
      {navGroups.map((group) => (
        <div key={group.title} className="space-y-1">
          {!collapsed ? (
            <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </p>
          ) : null}
          {group.items.map(({ to, label, icon: Icon }) => {
            const isActive =
              pathname === to ||
              pathname === `${to}/` ||
              pathname.startsWith(`${to}/`)

            const link = (
              <Link
                to={to}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  'border-l-[3px] border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                  isActive && 'border-l-primary bg-primary/10 text-primary',
                  collapsed && 'justify-center px-2',
                )}
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed ? <span className="truncate">{label}</span> : null}
              </Link>
            )

            if (!collapsed) {
              return <div key={to}>{link}</div>
            }

            return (
              <Tooltip key={to}>
                <TooltipTrigger className="w-full">{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
