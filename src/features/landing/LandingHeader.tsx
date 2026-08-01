import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AgroLogo } from '@/components/layout/AgroLogo'
import { buttonVariants } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { LANDING_NAV, scrollToSection } from '@/features/landing/nav'
import { cn } from '@/lib/utils'

/** Sticky public header — login CTA always visible on mobile and desktop. */
export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [overHero, setOverHero] = useState(true)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      const hero = document.getElementById('landing-hero')
      if (!hero) {
        setOverHero(false)
        return
      }
      const rect = hero.getBoundingClientRect()
      // Transparent only while the dark hero photo sits under the sticky header.
      setOverHero(rect.top < 72 && rect.bottom > 96)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = (id: string) => {
    setMenuOpen(false)
    window.setTimeout(() => scrollToSection(id), 50)
  }

  const transparent = overHero && !scrolled

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        transparent
          ? 'border-transparent bg-transparent text-primary-foreground'
          : 'border-b border-border bg-background/95 text-foreground shadow-sm backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3">
        <Link
          to="/"
          className={cn('flex min-w-0 shrink items-center', transparent ? 'text-primary-foreground' : 'text-primary')}
          aria-label="АгроДеск — на главную"
        >
          <span
            className={cn(
              'hidden min-[400px]:block [&>div]:h-10 [&>div]:px-0',
              transparent && '[&_svg]:text-primary-foreground [&_span]:text-primary-foreground',
            )}
          >
            <AgroLogo showText />
          </span>
          <span
            className={cn(
              'block min-[400px]:hidden [&>div]:h-10 [&>div]:px-0',
              transparent && '[&_svg]:text-primary-foreground',
            )}
          >
            <AgroLogo showText={false} />
          </span>
        </Link>

        <nav
          className={cn(
            'ml-auto hidden items-center gap-5 text-sm lg:flex',
            transparent ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
          aria-label="Разделы лендинга"
        >
          {LANDING_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                transparent ? 'hover:text-primary-foreground' : 'hover:text-foreground',
              )}
              onClick={() => scrollToSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <Link
          to="/login"
          className={cn(
            buttonVariants({ size: 'sm' }),
            'ml-auto shrink-0 whitespace-nowrap lg:ml-3',
            transparent &&
              'border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20',
          )}
        >
          Войти
        </Link>

        <button
          type="button"
          className={cn(
            'inline-flex size-9 shrink-0 items-center justify-center rounded-md border lg:hidden',
            transparent
              ? 'border-primary-foreground/35 text-primary-foreground'
              : 'border-border text-foreground',
          )}
          aria-label="Открыть меню"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[min(100%,20rem)] bg-background text-foreground">
          <SheetHeader>
            <SheetTitle className="landing-display text-primary">АгроДеск</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4" aria-label="Мобильное меню">
            {LANDING_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-md px-3 py-3 text-left text-base text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => goTo(item.id)}
              >
                {item.label}
              </button>
            ))}
            <Link
              to="/login"
              className={cn(buttonVariants({ size: 'lg' }), 'mt-4')}
              onClick={() => setMenuOpen(false)}
            >
              Войти в систему
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}
