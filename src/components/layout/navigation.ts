import type { LucideIcon } from 'lucide-react'
import {
  BarChart2,
  Clock,
  DollarSign,
  LayoutDashboard,
  Package,
  Truck,
  Users,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/worktime', label: 'Рабочее время', icon: Clock },
  { to: '/shipments', label: 'Отгрузки', icon: Truck },
  { to: '/inventory', label: 'Склад ТМЦ', icon: Package },
  { to: '/expenses', label: 'Затраты', icon: DollarSign },
  { to: '/employees', label: 'Сотрудники', icon: Users },
  { to: '/reports', label: 'Отчёты', icon: BarChart2 },
]

export function getPageTitle(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '') || '/'
  const item = NAV_ITEMS.find(
    (nav) => normalized === nav.to || normalized.startsWith(`${nav.to}/`),
  )
  return item?.label ?? 'АгроДеск'
}
