import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCurrentUser } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layoutStore'

interface SidebarFooterProps {
  collapsed: boolean
  onNavigate?: () => void
  showToggle?: boolean
}

export function SidebarFooter({
  collapsed,
  onNavigate,
  showToggle = true,
}: SidebarFooterProps) {
  const { data: user } = useCurrentUser()
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar)

  const profileLink = (
    <Link
      to="/profile"
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <UserRound className="size-5 shrink-0" />
      {!collapsed ? (
        <span className="min-w-0 truncate font-medium">
          {user?.fullName ?? 'Профиль'}
        </span>
      ) : null}
    </Link>
  )

  return (
    <div className="mt-auto space-y-1 border-t border-header-border p-2">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger className="w-full">{profileLink}</TooltipTrigger>
          <TooltipContent side="right">{user?.fullName ?? 'Профиль'}</TooltipContent>
        </Tooltip>
      ) : (
        profileLink
      )}

      {showToggle ? (
        <Button
          type="button"
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={toggleSidebar}
          className={cn('w-full text-muted-foreground', !collapsed && 'justify-start')}
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
          {!collapsed ? <span>Свернуть</span> : null}
        </Button>
      ) : null}
    </div>
  )
}
