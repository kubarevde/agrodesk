import { cn } from '@/lib/utils'
import { AgroLogo } from './AgroLogo'
import { SidebarFooter } from './SidebarFooter'
import { SidebarNav } from './SidebarNav'

interface AppSidebarProps {
  collapsed: boolean
  onNavigate?: () => void
  className?: string
  showToggle?: boolean
  /** Wider tap targets and safe-area padding for the mobile drawer. */
  mobile?: boolean
}

export function AppSidebar({
  collapsed,
  onNavigate,
  className,
  showToggle = true,
  mobile = false,
}: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-header-border bg-surface transition-[width] duration-200 ease-in-out',
        mobile ? 'h-dvh max-h-dvh' : 'h-full',
        collapsed ? 'w-16' : 'w-60',
        className,
      )}
    >
      <AgroLogo showText={!collapsed} reserveCloseSpace={mobile} />
      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} mobile={mobile} />
      <SidebarFooter
        collapsed={collapsed}
        onNavigate={onNavigate}
        showToggle={showToggle}
        mobile={mobile}
      />
    </aside>
  )
}
