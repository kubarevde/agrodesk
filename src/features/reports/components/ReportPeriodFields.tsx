import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ReportPeriodMode } from '@/features/reports/reportDefinitions'
import { getCurrentYearValue } from '@/features/reports/utils'

interface ReportPeriodFieldsProps {
  periodMode: ReportPeriodMode
  from: string
  to: string
  month: string
  year: string
  yearOptions: string[]
  onFromToChange: (from: string, to: string) => void
  onMonthChange: (month: string) => void
  onYearChange: (year: string) => void
}

export function ReportPeriodFields({
  periodMode,
  from,
  to,
  month,
  year,
  yearOptions,
  onFromToChange,
  onMonthChange,
  onYearChange,
}: ReportPeriodFieldsProps) {
  if (periodMode === 'month') {
    return (
      <div className="space-y-2">
        <Label htmlFor="report-month">Месяц</Label>
        <Input
          id="report-month"
          type="month"
          value={month}
          onChange={(event) => onMonthChange(event.target.value)}
        />
      </div>
    )
  }

  if (periodMode === 'year') {
    return (
      <div className="space-y-2">
        <Label>Год</Label>
        <Select
          value={year}
          onValueChange={(value) => onYearChange(value ?? getCurrentYearValue())}
          items={yearOptions.map((option) => ({ value: option, label: option }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выберите год" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Период</Label>
      <DateRangePicker
        from={from}
        to={to}
        onChange={({ from: nextFrom, to: nextTo }) => {
          if (nextFrom && nextTo) onFromToChange(nextFrom, nextTo)
          else if (nextFrom) onFromToChange(nextFrom, to)
          else if (nextTo) onFromToChange(from, nextTo)
        }}
        className="w-full"
      />
    </div>
  )
}
