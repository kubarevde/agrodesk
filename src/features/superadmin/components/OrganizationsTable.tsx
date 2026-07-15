import { format, parseISO } from 'date-fns'
import { Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OrgStatusBadge } from '@/features/superadmin/components/OrgStatusBadge'
import type { Organization } from '@/features/superadmin/types'

type OrganizationsTableProps = {
  organizations: Organization[]
  onEdit: (org: Organization) => void
  onToggleActive: (org: Organization) => void
  onDelete: (org: Organization) => void
}

export function OrganizationsTable({
  organizations,
  onEdit,
  onToggleActive,
  onDelete,
}: OrganizationsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Название</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>План</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Сотрудников</TableHead>
          <TableHead>Владелец</TableHead>
          <TableHead>Истекает</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((org) => (
          <TableRow key={org.id}>
            <TableCell className="font-medium">{org.name}</TableCell>
            <TableCell className="text-muted-foreground">{org.slug}</TableCell>
            <TableCell>{org.plan}</TableCell>
            <TableCell>
              <OrgStatusBadge org={org} />
            </TableCell>
            <TableCell>{org.employeesCount}</TableCell>
            <TableCell className="max-w-[160px] truncate">{org.ownerEmail ?? '—'}</TableCell>
            <TableCell>
              {org.trialEndsAt
                ? format(parseISO(org.trialEndsAt), 'dd.MM.yyyy')
                : '—'}
            </TableCell>
            <TableCell className="text-right">
              <div className="inline-flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Редактировать"
                  onClick={() => onEdit(org)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={org.isActive ? 'Заблокировать' : 'Разблокировать'}
                  onClick={() => onToggleActive(org)}
                >
                  {org.isActive ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Удалить"
                  onClick={() => onDelete(org)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
