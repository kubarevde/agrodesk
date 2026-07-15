import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useMyEarnings } from '@/features/employees/salaryHooks'
import { formatMoney, formatIsoDateRu } from '@/features/employees/salaryUtils'
import { getCurrentMonthValue } from '@/features/reports/utils'

export function MyEarningsSection() {
  const [month, setMonth] = useState(getCurrentMonthValue())
  const { data, isLoading } = useMyEarnings(month)

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Мои начисления</h2>
          <p className="text-xs text-muted-foreground">* Предварительный расчёт</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="my-earnings-month" className="text-xs">
            Месяц
          </Label>
          <Input
            id="my-earnings-month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="w-full sm:w-44"
          />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Смен</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{data.shiftsCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Часов</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{data.hours}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Начислено
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">~{formatMoney(data.totalAmount)}</p>
              </CardContent>
            </Card>
          </div>

          {data.shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">За этот месяц начислений нет</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Часы</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Источник</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.shifts.map((shift, index) => (
                    <TableRow key={`${shift.date}-${shift.workType}-${index}`}>
                      <TableCell>{formatIsoDateRu(shift.date)}</TableCell>
                      <TableCell>{shift.workType}</TableCell>
                      <TableCell>{shift.hours}</TableCell>
                      <TableCell>{formatMoney(shift.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-muted-foreground">
                          {shift.source}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </section>
  )
}
