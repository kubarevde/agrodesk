import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { HoldingContextBanner } from '@/features/holding/components/HoldingContextBanner'
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
      <div className="flex min-h-dvh bg-background text-foreground">
        <div className="hidden md:flex">
          <AppSidebar collapsed={sidebarCollapsed} />
        </div>

        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent
              side="left"
              showCloseButton
              className="w-[min(100vw-3rem,20rem)] max-w-none gap-0 p-0 sm:max-w-none"
            >
              <SheetTitle className="sr-only">Главное меню</SheetTitle>
              <SheetDescription className="sr-only">
                Навигация по разделам АгроДеск
              </SheetDescription>
              <AppSidebar
                collapsed={false}
                mobile
                onNavigate={() => setMobileMenuOpen(false)}
                className="h-dvh w-full border-r-0"
                showToggle={false}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <OfflineBanner />
          <HoldingContextBanner />
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  )
}
