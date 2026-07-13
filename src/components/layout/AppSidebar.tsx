import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layoutStore'
import { AgroLogo } from './AgroLogo'
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
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar)

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
      {showToggle ? (
        <div className="mt-auto border-t border-header-border p-2">
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
        </div>
      ) : null}
    </aside>
  )
}
