import { useMemo } from 'react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { Button } from '@/components/ui/button'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { entityOptions, selectOptions } from '@/lib/selectOptions'
import type { Employee } from '@/types'
import type { ShiftFilters } from '@/types'

const STATUS_OPTIONS = selectOptions([
  { value: 'all', label: 'Все' },
  { value: 'open', label: 'Открытые' },
  { value: 'closed', label: 'Закрытые' },
])

interface ShiftsFiltersProps {
  from?: string
  to?: string
  employeeId?: string
  status: ShiftFilters['status']
  employees: Employee[]
  hasActiveFilters: boolean
  onFromChange: (from?: string) => void
  onToChange: (to?: string) => void
  onEmployeeChange: (employeeId?: string) => void
  onStatusChange: (status: ShiftFilters['status']) => void
  onReset: () => void
}

export function ShiftsFilters({
  from,
  to,
  employeeId,
  status,
  employees,
  hasActiveFilters,
  onFromChange,
  onToChange,
  onEmployeeChange,
  onStatusChange,
  onReset,
}: ShiftsFiltersProps) {
  const employeeOptions = useMemo(
    () =>
      entityOptions(
        employees,
        (item) => item.id,
        (item) => item.employeeName,
        [{ value: 'all', label: 'Все сотрудники' }],
      ),
    [employees],
  )

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <DateRangePicker
        from={from}
        to={to}
        onChange={({ from: nextFrom, to: nextTo }) => {
          onFromChange(nextFrom)
          onToChange(nextTo)
        }}
      />

      <LabeledSelect
        className="md:w-52"
        value={employeeId ?? 'all'}
        options={employeeOptions}
        placeholder="Сотрудник"
        onValueChange={(value) =>
          onEmployeeChange(!value || value === 'all' ? undefined : value)
        }
      />

      <LabeledSelect
        className="md:w-40"
        value={status ?? 'all'}
        options={STATUS_OPTIONS}
        placeholder="Статус"
        onValueChange={(value) =>
          onStatusChange((value ?? 'all') as ShiftFilters['status'])
        }
      />

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={onReset}>
          Сбросить фильтры
        </Button>
      ) : null}
    </div>
  )
}
