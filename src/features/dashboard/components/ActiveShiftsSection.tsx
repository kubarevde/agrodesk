import { Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DashboardActiveShift } from '@/types'
import { formatShiftTime } from '@/features/worktime/utils'
import { ActiveShiftLiveDuration } from './ActiveShiftLiveDuration'

interface ActiveShiftsSectionProps {
  shifts: DashboardActiveShift[]
  isLoading: boolean
}

function ActiveShiftsCardList({ shifts }: { shifts: DashboardActiveShift[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {shifts.map((shift) => (
        <div key={shift.id} className="rounded-lg border border-border bg-surface p-4">
          <p className="font-medium text-foreground">{shift.employeeName}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <span>Объект</span>
            <span className="text-right text-foreground">{shift.location}</span>
            <span>Начало</span>
            <span className="text-right text-foreground">{formatShiftTime(shift.startTime)}</span>
            <span>Идёт</span>
            <span className="text-right text-foreground">
              <ActiveShiftLiveDuration shift={shift} />
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActiveShiftsSection({ shifts, isLoading }: ActiveShiftsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Кто сейчас работает
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTable />
        ) : shifts.length === 0 ? (
          <EmptyState icon={Users} title="Сейчас никто не работает" />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Объект</TableHead>
                    <TableHead>Начало</TableHead>
                    <TableHead>Идёт</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.employeeName}</TableCell>
                      <TableCell>{shift.location}</TableCell>
                      <TableCell>{formatShiftTime(shift.startTime)}</TableCell>
                      <TableCell>
                        <ActiveShiftLiveDuration shift={shift} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ActiveShiftsCardList shifts={shifts} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
