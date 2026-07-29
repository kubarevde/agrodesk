import { Link, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LifeBuoy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import {
  categoryLabel,
  priorityBadgeClass,
  priorityLabel,
  roleLabel,
  statusBadgeClass,
  statusLabel,
  supportCategoryOptions,
  supportPriorityOptions,
  supportRoleFilterOptions,
  supportScopeOptions,
  supportStatusOptions,
} from '@/features/support/labels'
import { useOrganizations } from '../hooks'
import { useSuperadminSupportTickets } from '../hooks/useSupport'

const SCOPE_OPTIONS = supportScopeOptions()
const STATUS_OPTIONS = supportStatusOptions('staff', true)
const PRIORITY_OPTIONS = supportPriorityOptions(true)
const CATEGORY_OPTIONS = supportCategoryOptions(true)
const ROLE_OPTIONS = supportRoleFilterOptions()

export function SupportInboxPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('all')
  const [orgId, setOrgId] = useState('all')
  const [role, setRole] = useState('all')
  const [category, setCategory] = useState('all')
  const [priority, setPriority] = useState('all')
  const [scope, setScope] = useState<'all' | 'unread' | 'mine'>('all')
  const { data: orgs = [] } = useOrganizations()
  const { data: tickets = [], isLoading } = useSuperadminSupportTickets({
    status: status === 'all' ? undefined : status,
    orgId: orgId === 'all' ? undefined : orgId,
    authorRole: role === 'all' ? undefined : role,
    category: category === 'all' ? undefined : category,
    priority: priority === 'all' ? undefined : priority,
    unreadOnly: scope === 'unread',
    assignedToMe: scope === 'mine',
  })

  const orgOptions = useMemo(
    () =>
      selectOptions([
        { value: 'all', label: 'Все организации' },
        ...orgs.map((org) => ({ value: org.id, label: org.name })),
      ]),
    [orgs],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Поддержка</h1>
        <p className="text-sm text-muted-foreground">
          Inbox обращений: организация, автор, роль и статус видны сразу.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LabeledSelect
          value={scope}
          options={SCOPE_OPTIONS}
          placeholder="Область"
          onValueChange={(v) => v && setScope(v as typeof scope)}
        />
        <LabeledSelect
          value={status}
          options={STATUS_OPTIONS}
          placeholder="Статус"
          onValueChange={(v) => v && setStatus(v)}
        />
        <LabeledSelect
          value={priority}
          options={PRIORITY_OPTIONS}
          placeholder="Приоритет"
          onValueChange={(v) => v && setPriority(v)}
        />
        <LabeledSelect
          value={orgId}
          options={orgOptions}
          placeholder="Организация"
          onValueChange={(v) => v && setOrgId(v)}
        />
        <LabeledSelect
          value={role}
          options={ROLE_OPTIONS}
          placeholder="Роль"
          onValueChange={(v) => v && setRole(v)}
        />
        <LabeledSelect
          value={category}
          options={CATEGORY_OPTIONS}
          placeholder="Категория"
          onValueChange={(v) => v && setCategory(v)}
        />
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="Обращений нет"
          description="Когда пользователь создаст обращение, оно появится здесь."
          action={{
            label: 'К организациям',
            onClick: () => void navigate({ to: '/superadmin/dashboard' }),
          }}
        />
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                to="/superadmin/support/$ticketId"
                params={{ ticketId: ticket.id }}
                className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-foreground">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.orgName} · {ticket.authorName} ({roleLabel(ticket.authorRole)}) ·{' '}
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
                    {ticket.unreadForStaff ? <Badge>Новое</Badge> : null}
                    <Badge className={priorityBadgeClass(ticket.priority)}>
                      {priorityLabel(ticket.priority)}
                    </Badge>
                    <Badge className={statusBadgeClass(ticket.status)}>
                      {statusLabel(ticket.status, 'staff')}
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
