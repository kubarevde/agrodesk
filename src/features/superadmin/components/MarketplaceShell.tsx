import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TABS: { to: string; label: string; end?: boolean }[] = [
  { to: '/superadmin/marketplace', label: 'Очередь', end: true },
  { to: '/superadmin/marketplace/categories', label: 'Категории' },
  { to: '/superadmin/marketplace/sellers', label: 'Продавцы' },
  { to: '/superadmin/marketplace/orders', label: 'Заказы' },
]

export function MarketplaceShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, '')

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Разделы маркетплейса">
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
