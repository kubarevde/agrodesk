import { useNavigate } from '@tanstack/react-router'
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
  isAdmin: boolean
  isLoading: boolean
}

function ActiveShiftsEmptyState({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate()

  return (
    <EmptyState
      icon={Users}
      title="Сейчас никто не работает"
      description={isAdmin ? 'Откройте смену для сотрудника на странице рабочего времени' : undefined}
      action={
        isAdmin
          ? {
              label: 'Открыть смену за сотрудника',
              onClick: () => navigate({ to: '/worktime' }),
            }
          : undefined
      }
    />
  )
}

function ActiveShiftsCardList({ shifts }: { shifts: DashboardActiveShift[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {shifts.map((shift) => (
        <Card key={shift.id}>
          <CardContent className="space-y-2 p-4">
            <p className="font-medium text-foreground">{shift.employeeName}</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <span>Объект</span>
              <span className="text-foreground">{shift.location}</span>
              <span>Начало</span>
              <span className="text-foreground">{formatShiftTime(shift.startTime)}</span>
              <span>Отработано</span>
              <span className="text-foreground">
                <ActiveShiftLiveDuration shift={shift} />
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ActiveShiftsSection({ shifts, isAdmin, isLoading }: ActiveShiftsSectionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Кто сейчас на смене
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable rows={3} columns={4} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Кто сейчас на смене
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <ActiveShiftsEmptyState isAdmin={isAdmin} />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Объект</TableHead>
                    <TableHead>Начало</TableHead>
                    <TableHead>Отработано</TableHead>
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
