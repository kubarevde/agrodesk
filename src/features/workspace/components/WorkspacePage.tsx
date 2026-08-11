import { useEffect, useMemo } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { workspaceHelp } from '@/features/help/content'
import { useCurrentUser } from '@/features/auth/hooks'
import { MyShiftPage } from '@/features/auth/MyShiftPage'
import { useMessengerUnreadCount } from '@/features/messenger/hooks'
import { MessengerPage } from '@/features/messenger/components/MessengerPage'
import { UnreadBadge } from '@/features/messenger/components/UnreadBadge'
import { useOrganizationSettings } from '@/features/settings/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { useMyShipmentRequests } from '@/features/shipment-requests/hooks'
import { MyShipmentsPage } from '@/features/shipment-requests/components/MyShipmentsPage'
import { TasksPage } from '@/features/tasks/components/TasksPage'
import { useTasks } from '@/features/tasks/hooks'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { hasAction, hasSection } from '@/lib/permissionActions'
import {
  canSeeWorkspaceTab,
  listVisibleWorkspaceTabs,
  resolveDefaultWorkspaceTab,
  WORKSPACE_TAB_ICONS,
  WORKSPACE_TAB_LABELS,
  WORKSPACE_TAB_LABELS_MOBILE,
  type WorkspaceTab,
} from '../workspaceTabs'

const workspaceRoute = getRouteApi('/_layout/workspace/')

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return <UnreadBadge count={count} className="shrink-0" />
}

export function WorkspacePage() {
  const navigate = useNavigate()
  const search = workspaceRoute.useSearch()
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const { data: orgSettings } = useOrganizationSettings()
  const isMobile = useIsMobile()

  const visibility = useMemo(
    () => ({
      role: user?.role,
      allowedSections: perms?.allowedSections,
      actions: perms?.actions,
      shipmentRequestsEnabled: orgSettings?.shipmentRequestsEnabled !== false,
    }),
    [orgSettings?.shipmentRequestsEnabled, perms?.actions, perms?.allowedSections, user?.role],
  )

  const visibleTabs = useMemo(
    () => listVisibleWorkspaceTabs(visibility),
    [visibility],
  )

  const tab: WorkspaceTab = useMemo(() => {
    if (canSeeWorkspaceTab(search.tab, visibility)) return search.tab
    return resolveDefaultWorkspaceTab(visibility) ?? 'shift'
  }, [search.tab, visibility])

  const canTasks = hasSection(perms?.allowedSections, 'tasks', user?.role)
  const canRequests =
    visibility.shipmentRequestsEnabled &&
    hasAction(perms?.actions, 'shipment_requests.execute', user?.role)

  const { data: activeTasks = [] } = useTasks({ status: 'active', scope: 'all' }, canTasks)
  const { data: myRequests = [] } = useMyShipmentRequests(canRequests)
  const messengerUnread = useMessengerUnreadCount()

  const tasksBadge = canTasks ? activeTasks.length : 0
  const requestsBadge = canRequests
    ? myRequests.filter((r) => r.status === 'new' || r.status === 'in_progress').length
    : 0

  useEffect(() => {
    if (!user || !perms) return
    if (canSeeWorkspaceTab(search.tab, visibility)) return
    const fallback = resolveDefaultWorkspaceTab(visibility)
    if (!fallback) return
    toast.error('У вас нет доступа к выбранному разделу')
    void navigate({
      to: '/workspace',
      search: { tab: fallback, chatId: undefined },
      replace: true,
    })
  }, [navigate, perms, search.tab, user, visibility])

  const setTab = (next: WorkspaceTab) => {
    if (!canSeeWorkspaceTab(next, visibility)) {
      toast.error('У вас нет доступа к выбранному разделу')
      return
    }
    void navigate({
      to: '/workspace',
      search: (prev) => ({
        ...prev,
        tab: next,
        chatId: next === 'messenger' ? prev.chatId : undefined,
      }),
    })
  }

  const labels = isMobile ? WORKSPACE_TAB_LABELS_MOBILE : WORKSPACE_TAB_LABELS
  const tabCount = visibleTabs.length
  const useMobileGrid = isMobile && tabCount >= 3

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 overflow-x-hidden">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-foreground">Рабочее место</h1>
        <p className="text-sm text-muted-foreground">
          Смена, задачи, заявки и сообщения в одном месте
        </p>
      </div>

      <RoleSectionHelp section="рабочее место" items={workspaceHelp} guideSection="workspace" />

      <div
        role="tablist"
        aria-label="Разделы рабочего места"
        className={cn(
          'w-full min-w-0 gap-1 rounded-xl bg-muted/80 p-1',
          useMobileGrid ? 'grid grid-cols-2' : 'flex',
        )}
      >
        {visibleTabs.map((key) => {
          const Icon = WORKSPACE_TAB_ICONS[key]
          const active = tab === key
          const badge =
            key === 'tasks'
              ? tasksBadge
              : key === 'requests'
                ? requestsBadge
                : key === 'messenger'
                  ? messengerUnread
                  : 0
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={WORKSPACE_TAB_LABELS[key]}
              onClick={() => setTab(key)}
              className={cn(
                'inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:flex-1 sm:px-3 sm:text-sm',
                useMobileGrid ? 'flex-col gap-0.5' : 'flex-1 flex-row',
                active
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="inline-flex max-w-full items-center justify-center gap-1">
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="text-center leading-tight whitespace-normal">{labels[key]}</span>
              </span>
              <TabBadge count={badge} />
            </button>
          )
        })}
      </div>

      <div className="min-w-0">
        {tab === 'shift' ? <MyShiftPage embedded /> : null}
        {tab === 'tasks' ? <TasksPage embedded /> : null}
        {tab === 'requests' ? <MyShipmentsPage embedded /> : null}
        {tab === 'messenger' ? (
          <MessengerPage
            chatId={search.chatId}
            embedded
            onSelectChat={(id) =>
              void navigate({
                to: '/workspace',
                search: { tab: 'messenger', chatId: id },
              })
            }
            onClearChat={() =>
              void navigate({
                to: '/workspace',
                search: { tab: 'messenger', chatId: undefined },
              })
            }
          />
        ) : null}
      </div>
    </div>
  )
}
