import { Users } from 'lucide-react'
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
    <div className="space-y-2 md:hidden">
      {shifts.map((shift) => (
        <div key={shift.id} className="rounded-lg border border-border bg-surface p-3">
          <p className="text-sm font-medium text-foreground">{shift.employeeName}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
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
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold text-foreground">Кто сейчас работает</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {isLoading ? (
          <SkeletonTable />
        ) : shifts.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Users className="size-4 shrink-0" />
            Сейчас никто не работает
          </div>
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
