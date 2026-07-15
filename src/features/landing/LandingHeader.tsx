import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { LANDING_NAV, scrollToSection } from '@/features/landing/nav'
import { cn } from '@/lib/utils'

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = (id: string) => {
    setMenuOpen(false)
    // Wait for sheet close so scroll target isn't obscured
    window.setTimeout(() => scrollToSection(id), 50)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-green-100/80 bg-white/80 backdrop-blur-md transition-shadow',
        scrolled && 'shadow-sm',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-[var(--landing-primary)]">
          АгроДеск
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[var(--landing-muted)] md:flex">
          {LANDING_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className="hover:text-[var(--landing-text)]"
              onClick={() => scrollToSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'hidden text-[var(--landing-text)] sm:inline-flex',
            )}
          >
            Войти
          </Link>
          <Link
            to="/login"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-[var(--landing-primary)] text-white hover:bg-green-700',
            )}
          >
            Попробовать
          </Link>

          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-green-100 text-[var(--landing-text)] md:hidden"
            aria-label="Открыть меню"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[min(100%,20rem)] bg-white">
          <SheetHeader>
            <SheetTitle className="text-[var(--landing-primary)]">АгроДеск</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
            {LANDING_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-lg px-3 py-3 text-left text-base text-[var(--landing-text)] hover:bg-green-50"
                onClick={() => goTo(item.id)}
              >
                {item.label}
              </button>
            ))}
            <Link
              to="/login"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'mt-4 bg-[var(--landing-primary)] text-white hover:bg-green-700',
              )}
              onClick={() => setMenuOpen(false)}
            >
              Войти
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}
