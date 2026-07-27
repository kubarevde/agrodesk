import { Download, Calculator } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { salaryHelp } from '@/features/help/content'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSalaryPreview } from '@/features/employees/salaryHooks'
import { formatMoney } from '@/features/employees/salaryUtils'
import { downloadReport, getCurrentMonthValue } from '@/features/reports/utils'

export function SalaryCalcTab() {
  const [month, setMonth] = useState(getCurrentMonthValue())
  const [requestedMonth, setRequestedMonth] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const { data, isLoading, isFetching } = useSalaryPreview(
    requestedMonth ?? '',
    Boolean(requestedMonth),
  )

  const noRateCount = useMemo(
    () => data?.shifts.filter((row) => row.source === 'Старый тариф').length ?? 0,
    [data],
  )

  const onCalculate = () => {
    if (!month) return
    setRequestedMonth(month)
  }

  const onDownload = async () => {
    const target = requestedMonth ?? month
    if (!target) return
    setDownloading(true)
    try {
      await downloadReport('/api/reports/salary', { month: target }, `salary_${target}.xlsx`)
      toast.success('Excel скачан')
    } catch {
      toast.error('Не удалось скачать Excel')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      <SectionHelp title="Справка: расчёт ЗП" items={salaryHelp} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label htmlFor="salary-month">Месяц</Label>
          <Input
            id="salary-month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="w-full sm:w-48"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onCalculate} className="bg-primary hover:bg-primary-hover">
            <Calculator className="size-4" />
            Рассчитать
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={downloading}
            onClick={() => void onDownload()}
          >
            <Download className="size-4" />
            Скачать Excel
          </Button>
        </div>
      </div>

      {!requestedMonth ? (
        <p className="text-sm text-muted-foreground">Выберите месяц и нажмите «Рассчитать»</p>
      ) : isLoading || isFetching ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">Период {data.from} — {data.to}</p>
            {noRateCount > 0 ? (
              <Badge variant="outline" className="text-muted-foreground">
                {noRateCount} без ставки
              </Badge>
            ) : null}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead>Смен</TableHead>
                  <TableHead>Часов</TableHead>
                  <TableHead>Обычн.</TableHead>
                  <TableHead>Сверхур.</TableHead>
                  <TableHead>К выплате</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.summary.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell className="font-mono text-sm">{row.employeeCode}</TableCell>
                    <TableCell>{row.shiftsCount}</TableCell>
                    <TableCell>{row.hours}</TableCell>
                    <TableCell>{row.regularHours}</TableCell>
                    <TableCell>{row.overtimeHours}</TableCell>
                    <TableCell>{formatMoney(row.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={6}>ИТОГО</TableCell>
                  <TableCell>{formatMoney(data.totalAmount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {data.summary.map((row) => (
              <li
                key={row.employeeId}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <p className="font-medium text-foreground">{row.employeeName}</p>
                <p className="font-mono text-xs text-muted-foreground">{row.employeeCode}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Смен</span>
                  <span className="text-right text-foreground">{row.shiftsCount}</span>
                  <span className="text-muted-foreground">Часов</span>
                  <span className="text-right text-foreground">{row.hours}</span>
                  <span className="text-muted-foreground">К выплате</span>
                  <span className="text-right font-medium text-foreground">
                    {formatMoney(row.amount)}
                  </span>
                </div>
              </li>
            ))}
            <li className="rounded-lg border border-border bg-muted/40 p-4 font-semibold">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>Итого</span>
                <span>{formatMoney(data.totalAmount)}</span>
              </div>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}
