import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AgroLogo } from '@/components/layout/AgroLogo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MarketShell({
  children,
  title,
}: {
  children: ReactNode
  title?: string
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <Link to="/market" className="min-w-0 shrink text-primary" aria-label="Витрина экопродукции">
            <span className="hidden min-[380px]:block">
              <AgroLogo showText />
            </span>
            <span className="block min-[380px]:hidden">
              <AgroLogo showText={false} />
            </span>
          </Link>
          {title ? (
            <p className="hidden truncate text-sm text-muted-foreground sm:block">{title}</p>
          ) : null}
          <nav className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2" aria-label="Витрина">
            <Link
              to="/"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'px-2 text-muted-foreground sm:px-3',
              )}
            >
              Главная
            </Link>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'bg-primary px-2 text-primary-foreground hover:bg-primary-hover sm:px-3',
              )}
            >
              КФХ
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-8">{children}</main>
    </div>
  )
}
