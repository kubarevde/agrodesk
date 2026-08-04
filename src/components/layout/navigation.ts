import type { LucideIcon } from 'lucide-react'
import {
  BarChart2,
  CalendarDays,
  ClipboardList,
  Clock,
  DollarSign,
  Handshake,
  HardHat,
  History,
  LayoutDashboard,
  Map,
  MessageCircle,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Tractor,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'
import type { CurrentUser } from '@/lib/transformers'
import { hasAction, type PermissionAction } from '@/lib/permissionActions'
import { filterNavBySections } from '@/lib/permissions'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** When set, item is hidden unless the user has this action (admin always sees it). */
  requiredAction?: PermissionAction
  /**
   * Extra section keys that also unlock this nav item
   * (e.g. Техника hub covers implements via top tabs).
   */
  alsoSections?: string[]
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

const MESSENGER_ITEM: NavItem = {
  to: '/messenger',
  label: 'Мессенджер',
  icon: MessageCircle,
}

const MY_SHIPMENTS_ITEM: NavItem = {
  to: '/shipment-requests/my',
  label: 'Мои заявки ТМЦ',
  icon: Truck,
  requiredAction: 'shipment_requests.execute',
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
  { to: '/equipment', label: 'Техника', icon: Tractor, alsoSections: ['implements'] },
  { to: '/maintenance', label: 'Ремонт и обслуживание', icon: HardHat },
  { to: '/purchase-planner', label: 'Планировщик закупок', icon: ShoppingCart },
  { to: '/inventory', label: 'ТМЦ', icon: Package },
]

const FINANCE_ITEMS: NavItem[] = [
  { to: '/shipments', label: 'Отгрузки урожая', icon: Truck },
  {
    to: '/shipment-requests',
    label: 'Заявки на отгрузку',
    icon: ClipboardList,
    requiredAction: 'shipment_requests.manage',
  },
  {
    to: '/seller-market',
    label: 'Магазин',
    icon: Store,
    requiredAction: 'marketplace.manage',
  },
  { to: '/expenses', label: 'Затраты', icon: DollarSign },
  { to: '/analytics/forecast', label: 'Прогноз и оптимизация', icon: TrendingUp },
  { to: '/reports', label: 'Отчёты', icon: BarChart2 },
]

const ADMIN_ITEMS: NavItem[] = [
  { to: '/employees', label: 'Сотрудники', icon: Users },
  { to: '/audit-log', label: 'История изменений', icon: History },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Операционные',
    items: [MY_SHIFT_ITEM, MESSENGER_ITEM, MY_SHIPMENTS_ITEM, ...OPERATIONS_ITEMS],
  },
  { title: 'Ресурсы', items: RESOURCES_ITEMS },
  { title: 'Финансы и отчёты', items: FINANCE_ITEMS },
  { title: 'Администрирование', items: ADMIN_ITEMS },
]

/** Flat list for page titles and legacy lookups. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

/**
 * Build sidebar/mobile nav from the shared NAV_GROUPS + permission model.
 * When employee permissions are still loading (undefined), show DEFAULT_EMPLOYEE_SECTIONS
 * (my-shift + sharing) — not the locked-only set. Once loaded, respect exact grants.
 */
export function getNavGroups(
  role?: CurrentUser['role'],
  allowedSections?: string[],
  actions?: string[],
  options?: { shipmentRequestsEnabled?: boolean; marketplaceEnabled?: boolean },
): NavGroup[] {
  const shipmentRequestsEnabled = options?.shipmentRequestsEnabled !== false
  // Default off — hide until org settings explicitly enable marketplace.
  const marketplaceEnabled = options?.marketplaceEnabled === true
  if (role === 'employee' && allowedSections === undefined) {
    return [{ title: 'Операционные', items: [MY_SHIFT_ITEM, MESSENGER_ITEM, SHARING_ITEM] }]
  }
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: filterNavBySections(group.items, allowedSections, role).filter((item) => {
      if (
        !shipmentRequestsEnabled &&
        (item.requiredAction === 'shipment_requests.manage' ||
          item.requiredAction === 'shipment_requests.execute')
      ) {
        return false
      }
      if (!marketplaceEnabled && item.requiredAction === 'marketplace.manage') {
        return false
      }
      if (!item.requiredAction) return true
      return hasAction(actions, item.requiredAction, role)
    }),
  })).filter((group) => group.items.length > 0)
}

export function getNavItems(
  role?: CurrentUser['role'],
  allowedSections?: string[],
  actions?: string[],
  options?: { shipmentRequestsEnabled?: boolean; marketplaceEnabled?: boolean },
): NavItem[] {
  return getNavGroups(role, allowedSections, actions, options).flatMap((group) => group.items)
}

export function getPageTitle(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (normalized === '/profile' || normalized.startsWith('/profile/')) {
    return 'Профиль'
  }
  if (normalized === '/notifications' || normalized.startsWith('/notifications/')) {
    return 'Уведомления'
  }
  if (normalized === '/support' || normalized.startsWith('/support/')) {
    if (normalized.includes('/guide')) return 'Как пользоваться системой'
    return 'Поддержка'
  }
  if (normalized === '/messenger' || normalized.startsWith('/messenger/')) {
    return 'Мессенджер'
  }
  if (normalized === '/agro-calendar' || normalized.startsWith('/agro-calendar/')) {
    return 'Агрокалендарь'
  }
  if (normalized === '/shipment-requests' || normalized.startsWith('/shipment-requests/')) {
    if (normalized.endsWith('/my') || normalized.includes('/my/')) {
      return 'Мои заявки ТМЦ'
    }
    return 'Заявки на отгрузку'
  }
  if (normalized === '/seller-market' || normalized.startsWith('/seller-market/')) {
    return 'Магазин'
  }
  if (normalized === '/implements' || normalized.startsWith('/implements/')) {
    return 'Приспособления'
  }
  if (normalized === '/equipment' || normalized.startsWith('/equipment/')) {
    return 'Техника'
  }
  const item = NAV_ITEMS.find(
    (nav) => normalized === nav.to || normalized.startsWith(`${nav.to}/`),
  )
  return item?.label ?? 'АгроДеск'
}