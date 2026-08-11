import { Briefcase, CheckSquare, Clock, MessageCircle, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { hasAction, hasSection } from '@/lib/permissionActions'

export const WORKSPACE_TABS = ['shift', 'tasks', 'requests', 'messenger'] as const

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number]

export type WorkspaceSearch = {
  tab: WorkspaceTab
  chatId?: string
}

export const WORKSPACE_TAB_LABELS: Record<WorkspaceTab, string> = {
  shift: 'Моя смена',
  tasks: 'Задачи',
  requests: 'Мои заявки ТМЦ',
  messenger: 'Мессенджер',
}

/** Compact labels for narrow viewports (320–390px). */
export const WORKSPACE_TAB_LABELS_MOBILE: Record<WorkspaceTab, string> = {
  shift: 'Смена',
  tasks: 'Задачи',
  requests: 'Заявки',
  messenger: 'Чаты',
}

export const WORKSPACE_TAB_ICONS: Record<WorkspaceTab, LucideIcon> = {
  shift: Clock,
  tasks: CheckSquare,
  requests: Truck,
  messenger: MessageCircle,
}

export function parseWorkspaceTab(raw: unknown): WorkspaceTab | null {
  if (raw === 'shift' || raw === 'tasks' || raw === 'requests' || raw === 'messenger') {
    return raw
  }
  return null
}

export type WorkspaceVisibilityInput = {
  role?: string
  allowedSections?: string[]
  actions?: string[]
  shipmentRequestsEnabled?: boolean
}

export function canSeeWorkspaceTab(
  tab: WorkspaceTab,
  input: WorkspaceVisibilityInput,
): boolean {
  const { role, allowedSections, actions, shipmentRequestsEnabled = true } = input
  if (role === 'admin') {
    if (tab === 'requests') return shipmentRequestsEnabled
    return true
  }
  switch (tab) {
    case 'shift':
      return hasSection(allowedSections, 'my-shift', role)
    case 'tasks':
      return hasSection(allowedSections, 'tasks', role)
    case 'requests':
      return (
        shipmentRequestsEnabled &&
        hasAction(actions, 'shipment_requests.execute', role)
      )
    case 'messenger':
      return true
    default:
      return false
  }
}

export function listVisibleWorkspaceTabs(
  input: WorkspaceVisibilityInput,
): WorkspaceTab[] {
  return WORKSPACE_TABS.filter((tab) => canSeeWorkspaceTab(tab, input))
}

/** Default tab: shift if allowed, else first available in order. */
export function resolveDefaultWorkspaceTab(
  input: WorkspaceVisibilityInput,
): WorkspaceTab | null {
  const visible = listVisibleWorkspaceTabs(input)
  return visible[0] ?? null
}

export function canAccessWorkspace(input: WorkspaceVisibilityInput): boolean {
  return listVisibleWorkspaceTabs(input).length > 0
}

export const WORKSPACE_NAV_ICON = Briefcase
