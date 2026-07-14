import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Employee } from '@/types'
import type { ShiftFilters } from '@/types'

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

      <Select
        value={employeeId ?? 'all'}
        onValueChange={(value) =>
          onEmployeeChange(value === 'all' || value == null ? undefined : String(value))
        }
      >
        <SelectTrigger className="w-full md:w-52">
          <SelectValue placeholder="Сотрудник" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все сотрудники</SelectItem>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.employeeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status ?? 'all'}
        onValueChange={(value) => onStatusChange((value ?? 'all') as ShiftFilters['status'])}
      >
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="open">Открытые</SelectItem>
          <SelectItem value="closed">Закрытые</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={onReset}>
          Сбросить фильтры
        </Button>
      ) : null}
    </div>
  )
}
