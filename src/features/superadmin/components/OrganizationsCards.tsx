import { format, parseISO } from 'date-fns'
import { Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import { OrgStatusBadge } from '@/features/superadmin/components/OrgStatusBadge'
import { orgPlanLabel } from '@/features/superadmin/plans'
import type { Organization } from '@/features/superadmin/types'
import { regionLabel } from '@/lib/regions.ru'

type OrganizationsCardsProps = {
  organizations: Organization[]
  onEdit: (org: Organization) => void
  onToggleActive: (org: Organization) => void
  onDelete: (org: Organization) => void
}

/** Tile cards for organizations (all breakpoints). */
export function OrganizationsCards({
  organizations,
  onEdit,
  onToggleActive,
  onDelete,
}: OrganizationsCardsProps) {
  return (
    <ul
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      data-layout="cards"
    >
      {organizations.map((org) => (
        <li key={org.id} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{org.name}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{org.slug}</p>
            </div>
            <CardActionsMenu
              title={org.name}
              ariaLabel="Действия"
              actions={[
                {
                  id: 'edit',
                  label: 'Редактировать',
                  icon: Pencil,
                  onSelect: () => onEdit(org),
                },
                {
                  id: 'toggle',
                  label: org.isActive ? 'Заблокировать' : 'Разблокировать',
                  icon: org.isActive ? Pause : Play,
                  onSelect: () => onToggleActive(org),
                },
                {
                  id: 'delete',
                  label: 'Удалить',
                  icon: Trash2,
                  variant: 'destructive',
                  onSelect: () => onDelete(org),
                },
              ]}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <OrgStatusBadge org={org} />
            <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {orgPlanLabel(org.plan)}
            </span>
            <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
              Маркетплейс: {org.marketplaceEnabled ? 'включён' : '—'}
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Регион</dt>
              <dd className="truncate text-foreground">{regionLabel(org.region)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Сотрудников</dt>
              <dd className="text-foreground">{org.employeesCount}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Владелец</dt>
              <dd className="truncate text-foreground">{org.ownerEmail ?? '—'}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Истекает</dt>
              <dd className="text-foreground">
                {org.trialEndsAt
                  ? format(parseISO(org.trialEndsAt), 'dd.MM.yyyy')
                  : '—'}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  )
}
