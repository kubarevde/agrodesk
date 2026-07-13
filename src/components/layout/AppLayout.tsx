import type { ReactNode } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useLayoutStore } from '@/stores/layoutStore'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed)
  const mobileMenuOpen = useLayoutStore((state) => state.mobileMenuOpen)
  const setMobileMenuOpen = useLayoutStore((state) => state.setMobileMenuOpen)

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <div className="hidden md:flex">
          <AppSidebar collapsed={sidebarCollapsed} />
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-60 p-0" showCloseButton>
            <AppSidebar
              collapsed={false}
              onNavigate={() => setMobileMenuOpen(false)}
              className="w-full border-r-0"
              showToggle={false}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  )
}
