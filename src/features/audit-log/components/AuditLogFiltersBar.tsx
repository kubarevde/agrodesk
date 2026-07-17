import { useMemo } from 'react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { entityOptions } from '@/lib/selectOptions'
import {
  getAuditActionFilterOptions,
  getAuditSectionFilterOptions,
} from '../lib/auditLabels'

type EmployeeOption = { id: string; name: string }

type AuditLogFiltersBarProps = {
  entityType?: string
  employeeId?: string
  action?: string
  fromDate?: string
  toDate?: string
  employees: EmployeeOption[]
  onEntityType: (value?: string) => void
  onEmployeeId: (value?: string) => void
  onAction: (value?: string) => void
  onFromDate: (value?: string) => void
  onToDate: (value?: string) => void
}

const SECTION_OPTIONS = getAuditSectionFilterOptions()
const ACTION_OPTIONS = getAuditActionFilterOptions()

export function AuditLogFiltersBar({
  entityType,
  employeeId,
  action,
  fromDate,
  toDate,
  employees,
  onEntityType,
  onEmployeeId,
  onAction,
  onFromDate,
  onToDate,
}: AuditLogFiltersBarProps) {
  const employeeOptions = useMemo(
    () =>
      entityOptions(
        employees,
        (item) => item.id,
        (item) => item.name,
        [{ value: 'all', label: 'Все сотрудники' }],
      ),
    [employees],
  )

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <DateRangePicker
        from={fromDate}
        to={toDate}
        onChange={({ from, to }) => {
          onFromDate(from)
          onToDate(to)
        }}
      />

      <LabeledSelect
        className="md:w-52"
        value={entityType ?? 'all'}
        options={SECTION_OPTIONS}
        placeholder="Раздел"
        onValueChange={(value) =>
          onEntityType(!value || value === 'all' ? undefined : value)
        }
      />

      <LabeledSelect
        className="md:w-52"
        value={employeeId ?? 'all'}
        options={employeeOptions}
        placeholder="Кто изменил"
        onValueChange={(value) =>
          onEmployeeId(!value || value === 'all' ? undefined : value)
        }
      />

      <LabeledSelect
        className="md:w-40"
        value={action ?? 'all'}
        options={ACTION_OPTIONS}
        placeholder="Действие"
        onValueChange={(value) =>
          onAction(!value || value === 'all' ? undefined : value)
        }
      />
    </div>
  )
}
