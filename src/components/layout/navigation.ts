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

export interface NavGroup {
  title: string
  items: NavItem[]
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

const OPERATIONS_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/worktime', label: 'Смены', icon: Clock },
  { to: '/agro-calendar', label: 'Агрокалендарь', icon: CalendarDays },
  SHARING_ITEM,
]

const RESOURCES_ITEMS: NavItem[] = [
  { to: '/fields', label: 'Поля', icon: Map },
  { to: '/equipment', label: 'Техника', icon: Tractor },
  { to: '/implements', label: 'Приспособления', icon: Wrench },
  { to: '/inventory', label: 'ТМЦ', icon: Package },
]

const FINANCE_ITEMS: NavItem[] = [
  { to: '/shipments', label: 'Отгрузки', icon: Truck },
  { to: '/expenses', label: 'Затраты', icon: DollarSign },
  { to: '/reports', label: 'Отчёты', icon: BarChart2 },
]

const ADMIN_ITEMS: NavItem[] = [
  { to: '/employees', label: 'Сотрудники', icon: Users },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export const NAV_GROUPS: NavGroup[] = [
  { title: 'Операционные', items: [MY_SHIFT_ITEM, ...OPERATIONS_ITEMS] },
  { title: 'Ресурсы', items: RESOURCES_ITEMS },
  { title: 'Финансы и отчёты', items: FINANCE_ITEMS },
  { title: 'Администрирование', items: ADMIN_ITEMS },
]

/** Flat list for page titles and legacy lookups. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

export function getNavGroups(role?: CurrentUser['role']): NavGroup[] {
  if (role === 'employee') {
    return [{ title: 'Операционные', items: [MY_SHIFT_ITEM, SHARING_ITEM] }]
  }
  return NAV_GROUPS
}

export function getNavItems(role?: CurrentUser['role']): NavItem[] {
  return getNavGroups(role).flatMap((group) => group.items)
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
