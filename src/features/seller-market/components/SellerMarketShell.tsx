import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TABS: { to: string; label: string; end?: boolean }[] = [
  { to: '/seller-market', label: 'Обзор', end: true },
  { to: '/seller-market/listings', label: 'Товары' },
  { to: '/seller-market/orders', label: 'Заказы' },
  { to: '/seller-market/profile', label: 'Профиль магазина' },
]

export function SellerMarketShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, '')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Магазин на витрине</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Управление объявлениями и заявками покупателей. Включение витрины — на стороне
          платформы.
        </p>
      </div>
      <nav
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
        aria-label="Разделы магазина"
      >
        {TABS.map((tab) => {
          const active = tab.end
            ? pathname === tab.to
            : pathname === tab.to || pathname.startsWith(`${tab.to}/`)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
