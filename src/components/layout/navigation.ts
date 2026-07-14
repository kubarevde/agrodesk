import type { LucideIcon } from 'lucide-react'
import {
  BarChart2,
  Clock,
  DollarSign,
  LayoutDashboard,
  Package,
  Settings,
  Truck,
  Users,
} from 'lucide-react'
import type { CurrentUser } from '@/lib/transformers'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const MY_SHIFT_ITEM: NavItem = {
  to: '/my-shift',
  label: 'Моя смена',
  icon: Clock,
}

const MANAGER_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/worktime', label: 'Рабочее время', icon: Clock },
  { to: '/shipments', label: 'Отгрузки', icon: Truck },
  { to: '/inventory', label: 'Склад ТМЦ', icon: Package },
  { to: '/expenses', label: 'Затраты', icon: DollarSign },
  { to: '/employees', label: 'Сотрудники', icon: Users },
  { to: '/reports', label: 'Отчёты', icon: BarChart2 },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export const NAV_ITEMS: NavItem[] = [MY_SHIFT_ITEM, ...MANAGER_ITEMS]

export function getNavItems(role?: CurrentUser['role']): NavItem[] {
  if (role === 'employee') {
    return [MY_SHIFT_ITEM]
  }
  return NAV_ITEMS
}

export function getPageTitle(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (normalized === '/profile' || normalized.startsWith('/profile/')) {
    return 'Профиль'
  }
  const item = NAV_ITEMS.find(
    (nav) => normalized === nav.to || normalized.startsWith(`${nav.to}/`),
  )
  return item?.label ?? 'АгроДеск'
}

