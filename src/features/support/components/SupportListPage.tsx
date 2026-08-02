import { Link, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LifeBuoy, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { useCurrentUser } from '@/features/auth/hooks'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { SupportGuideCard } from '@/features/help/components/SupportGuideCard'
import { supportHelp } from '@/features/help/content'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { hasAction } from '@/lib/permissionActions'
import { useMySupportTickets, useOrgSupportTickets } from '../hooks'
import {
  categoryLabel,
  filterSupportTicketsByFocus,
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
  supportListFocusOptions,
  supportSortOptions,
} from '../labels'

const FOCUS_OPTIONS = supportListFocusOptions()
const SORT_OPTIONS = supportSortOptions()

export function SupportListPage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const canViewOrg = hasAction(perms?.actions, 'support.view_org_tickets', user?.role)
  const [focus, setFocus] = useState('all')
  const [sort, setSort] = useState<'updated' | 'status'>('updated')
  const apiStatus =
    focus === 'all' || focus === 'unread' ? undefined : focus
  const filters = { status: apiStatus, sort }
  const mineQuery = useMySupportTickets(filters)
  const orgQuery = useOrgSupportTickets(canViewOrg, filters)
  const { data: tickets = [], isLoading } = canViewOrg ? orgQuery : mineQuery
  const visible = useMemo(
    () => filterSupportTicketsByFocus(tickets, focus),
    [tickets, focus],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Поддержка</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {canViewOrg
              ? 'Обращения организации. Отвечать может только автор; ответ приходит в его переписку.'
              : 'Ваши обращения. Новый ответ отметится в меню и меткой в списке.'}
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 shrink-0"
          onClick={() => void navigate({ to: '/support/new' })}
        >
          <Plus className="size-4" />
          Новое обращение
        </Button>
      </div>

      <SupportGuideCard />
      <RoleSectionHelp section="поддержка" items={supportHelp} guideSection="support" />

      <div className="flex flex-col gap-3 sm:flex-row">
        <LabeledSelect
          className="sm:w-56"
          value={focus}
          options={FOCUS_OPTIONS}
          placeholder="Фильтр"
          onValueChange={(v) => v && setFocus(v)}
        />
        <LabeledSelect
          className="sm:w-52"
          value={sort}
          options={SORT_OPTIONS}
          placeholder="Сортировка"
          onValueChange={(v) => {
            if (v === 'updated' || v === 'status') setSort(v)
          }}
        />
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={tickets.length === 0 ? 'Обращений пока нет' : 'Нет обращений по фильтру'}
          description={
            tickets.length === 0
              ? 'Если что-то не работает — создайте обращение. Или сначала откройте гайд выше.'
              : 'Смените фильтр или откройте «Все обращения».'
          }
          action={
            tickets.length === 0
              ? {
                  label: 'Создать обращение',
                  onClick: () => void navigate({ to: '/support/new' }),
                }
              : {
                  label: 'Сбросить фильтр',
                  onClick: () => setFocus('all'),
                }
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((ticket) => (
            <li key={ticket.id}>
              <Link
                to="/support/$ticketId"
                params={{ ticketId: ticket.id }}
                className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-foreground">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {canViewOrg ? `${ticket.authorName} · ` : ''}
                      {categoryLabel(ticket.category)}
                      {ticket.lastMessageAt
                        ? ` · ${format(new Date(ticket.lastMessageAt), 'd MMM, HH:mm', { locale: ru })}`
                        : ''}
                    </p>
                    {ticket.lastMessagePreview ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {ticket.lastMessagePreview}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {ticket.unreadForUser ? <Badge>Новый ответ</Badge> : null}
                    <Badge className={priorityBadgeClass(ticket.priority)}>
                      {priorityLabel(ticket.priority)}
                    </Badge>
                    <Badge className={statusBadgeClass(ticket.status)}>
                      {statusLabel(ticket.status, 'user')}
                    </Badge>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
