import { cn } from '@/lib/utils'
import { AgroLogo } from './AgroLogo'
import { SidebarFooter } from './SidebarFooter'
import { SidebarNav } from './SidebarNav'

interface AppSidebarProps {
  collapsed: boolean
  onNavigate?: () => void
  className?: string
  showToggle?: boolean
}

export function AppSidebar({
  collapsed,
  onNavigate,
  className,
  showToggle = true,
}: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-header-border bg-surface transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
        className,
      )}
    >
      <AgroLogo showText={!collapsed} />
      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      <SidebarFooter
        collapsed={collapsed}
        onNavigate={onNavigate}
        showToggle={showToggle}
      />
    </aside>
  )
}
