import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCurrentUser } from '@/features/auth/hooks'
import { useMessengerUnreadCount } from '@/features/messenger/hooks'
import { useOrganizationSettings } from '@/features/settings/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { getNavGroups } from './navigation'

interface SidebarNavProps {
  collapsed: boolean
  onNavigate?: () => void
  mobile?: boolean
}

function NavSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-2 px-2 py-1" aria-busy="true" aria-label="Загрузка меню">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-9 animate-pulse rounded-md bg-muted/60',
            collapsed ? 'mx-auto w-9' : 'w-full',
          )}
        />
      ))}
    </div>
  )
}

export function SidebarNav({ collapsed, onNavigate, mobile = false }: SidebarNavProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: user } = useCurrentUser()
  const { data: perms, isPending } = useUserPermissions(Boolean(user))
  const { data: orgSettings } = useOrganizationSettings()
  const messengerUnread = useMessengerUnreadCount()

  if (user && isPending && !perms) {
    return <NavSkeleton collapsed={collapsed} />
  }

  const navGroups = getNavGroups(user?.role, perms?.allowedSections, perms?.actions, {
    shipmentRequestsEnabled: orgSettings?.shipmentRequestsEnabled !== false,
    marketplaceEnabled: orgSettings?.marketplaceEnabled === true,
  })

  return (
    <nav
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-2 py-1',
        mobile && 'pb-2',
      )}
    >
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
              pathname.startsWith(`${to}/`) ||
              (to === '/workspace' &&
                (pathname.startsWith('/my-shift') ||
                  pathname.startsWith('/tasks') ||
                  pathname.startsWith('/messenger') ||
                  pathname.includes('/shipment-requests/my'))) ||
              (to === '/equipment' &&
                (pathname === '/implements' ||
                  pathname === '/implements/' ||
                  pathname.startsWith('/implements/')))
            const showWorkspaceDot = to === '/workspace' && messengerUnread > 0

            const link = (
              <Link
                to={to}
                onClick={onNavigate}
                className={cn(
                  'relative flex items-center gap-3 rounded-md px-3 text-sm transition-colors',
                  mobile ? 'min-h-11 py-2.5' : 'py-2',
                  'border-l-[3px] border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                  isActive && 'border-l-primary bg-primary/10 text-primary',
                  collapsed && 'justify-center px-2',
                )}
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
                {showWorkspaceDot ? (
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full bg-primary',
                      collapsed && 'absolute -right-0.5 -top-0.5',
                    )}
                    aria-label="Есть непрочитанные сообщения"
                    data-testid="nav-workspace-activity"
                  />
                ) : null}
              </Link>
            )

            if (!collapsed) {
              return <div key={to}>{link}</div>
            }

            return (
              <Tooltip key={to}>
                <TooltipTrigger className="w-full">{link}</TooltipTrigger>
                <TooltipContent side="right">
                  {label}
                  {showWorkspaceDot ? ' · есть новое' : ''}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
