import { format, parseISO } from 'date-fns'
import type { Organization } from '@/features/superadmin/types'
import { OrgFormSection } from '@/features/superadmin/components/OrgFormSection'

type OrgSummaryBlockProps = {
  organization: Organization
  hierarchyLabel: string
}

export function OrgSummaryBlock({ organization, hierarchyLabel }: OrgSummaryBlockProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Название', value: organization.name },
    { label: 'Slug', value: organization.slug },
    { label: 'Владелец', value: organization.ownerEmail ?? '—' },
    {
      label: 'Создана',
      value: organization.createdAt
        ? format(parseISO(organization.createdAt), 'dd.MM.yyyy')
        : '—',
    },
    {
      label: 'Сотрудники',
      value: `${organization.employeesCount} / ${organization.maxEmployees}`,
    },
    { label: 'Активные смены', value: String(organization.activeShiftsCount) },
    { label: 'В холдинге', value: hierarchyLabel },
  ]

  return (
    <OrgFormSection
      title="Сводка"
      description="Только чтение. Идентификаторы организации не меняются из этой формы."
    >
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="truncate text-sm font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </OrgFormSection>
  )
}
