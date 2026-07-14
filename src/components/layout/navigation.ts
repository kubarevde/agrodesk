import type { LucideIcon } from 'lucide-react'
import {
  BarChart2,
  CalendarDays,
  Clock,
  DollarSign,
  Handshake,
  LayoutDashboard,
  Map,
  Package,
  Settings,
  Tractor,
  Truck,
  Users,
  Wrench,
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

const SHARING_ITEM: NavItem = {
  to: '/sharing',
  label: 'Шеринг',
  icon: Handshake,
}

const MANAGER_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/fields', label: 'Поля', icon: Map },
  { to: '/equipment', label: 'Техника', icon: Tractor },
  { to: '/implements', label: 'Приспособления', icon: Wrench },
  { to: '/worktime', label: 'Рабочее время', icon: Clock },
  { to: '/agro-calendar', label: 'Агрокалендарь', icon: CalendarDays },
  { to: '/shipments', label: 'Отгрузки', icon: Truck },
  { to: '/inventory', label: 'Склад ТМЦ', icon: Package },
  { to: '/expenses', label: 'Затраты', icon: DollarSign },
  SHARING_ITEM,
  { to: '/employees', label: 'Сотрудники', icon: Users },
  { to: '/reports', label: 'Отчёты', icon: BarChart2 },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export const NAV_ITEMS: NavItem[] = [MY_SHIFT_ITEM, ...MANAGER_ITEMS]

export function getNavItems(role?: CurrentUser['role']): NavItem[] {
  if (role === 'employee') {
    return [MY_SHIFT_ITEM, SHARING_ITEM]
  }
  return NAV_ITEMS
}

export function getPageTitle(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (normalized === '/profile' || normalized.startsWith('/profile/')) {
    return 'Профиль'
  }
  if (normalized === '/notifications' || normalized.startsWith('/notifications/')) {
    return 'Уведомления'
  }
  if (normalized === '/agro-calendar' || normalized.startsWith('/agro-calendar/')) {
    return 'Агрокалендарь'
  }
  const item = NAV_ITEMS.find(
    (nav) => normalized === nav.to || normalized.startsWith(`${nav.to}/`),
  )
  return item?.label ?? 'АгроДеск'
}
