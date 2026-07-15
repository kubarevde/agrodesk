import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Employee } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { useEmployee, useEmployeeMonthStats } from '@/features/employees/hooks'
import { EmployeeProfileBody } from './EmployeeProfileBody'
import { EmployeeRatesSection } from './EmployeeRatesSection'
import { EmployeeTelegramBlock } from './EmployeeTelegramBlock'

interface EmployeeDetailSheetProps {
  employee: Employee | null
  open: boolean
  onClose: () => void
}

export function EmployeeDetailSheet({ employee, open, onClose }: EmployeeDetailSheetProps) {
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'manager' || user?.role === 'admin'
  const { data: detail, isLoading: detailLoading } = useEmployee(
    open ? employee?.id : undefined,
  )
  const { data: stats, isLoading: statsLoading } = useEmployeeMonthStats(
    open ? employee?.id : undefined,
  )

  const current = detail ?? employee

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {current ? (
          <>
            <SheetHeader>
              <SheetTitle>{current.employeeName}</SheetTitle>
              <SheetDescription>{current.employeeCode}</SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-6">
              {canManage ? (
                <Tabs defaultValue="profile">
                  <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="profile">Профиль</TabsTrigger>
                    <TabsTrigger value="rates">Ставки оплаты</TabsTrigger>
                  </TabsList>
                  <TabsContent value="profile" className="space-y-4">
                    <EmployeeProfileBody
                      current={current}
                      detailLoading={detailLoading && !detail}
                      stats={stats}
                      statsLoading={statsLoading}
                    />
                    <EmployeeTelegramBlock
                      employeeId={current.id}
                      telegramId={current.telegramId}
                    />
                  </TabsContent>
                  <TabsContent value="rates">
                    <EmployeeRatesSection employeeId={current.id} />
                  </TabsContent>
                </Tabs>
              ) : (
                <EmployeeProfileBody
                  current={current}
                  detailLoading={detailLoading && !detail}
                  stats={stats}
                  statsLoading={statsLoading}
                />
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
