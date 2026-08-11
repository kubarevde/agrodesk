import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Employee } from '@/types'
import type { EmployeeMonthStats } from '@/features/employees/hooks'
import { EmployeePayrollHistorySection } from './EmployeePayrollHistorySection'
import { EmployeeProfileBody } from './EmployeeProfileBody'
import { EmployeeRatesSection } from './EmployeeRatesSection'
import { EmployeeShiftsSection } from './EmployeeShiftsSection'
import { EmployeeTelegramBlock } from './EmployeeTelegramBlock'
import { EmployeeTasksBlock } from '@/features/tasks/components/EmployeeTasksBlock'

type EmployeeDetailTabsProps = {
  employee: Employee
  stats: EmployeeMonthStats | undefined
  statsLoading: boolean
  canManageRates: boolean
  canViewPayroll: boolean
  canViewTasks?: boolean
}

export function EmployeeDetailTabs({
  employee,
  stats,
  statsLoading,
  canManageRates,
  canViewPayroll,
  canViewTasks = false,
}: EmployeeDetailTabsProps) {
  return (
    <Tabs defaultValue="profile" className="min-w-0 w-full max-w-full overflow-x-hidden">
      <TabsList className="flex h-auto w-full max-w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="profile" className="shrink">
          Основное
        </TabsTrigger>
        <TabsTrigger value="rates" className="shrink">
          Оплата труда
        </TabsTrigger>
        {canViewPayroll ? (
          <>
            <TabsTrigger value="accruals" className="shrink">
              Начисления
            </TabsTrigger>
            <TabsTrigger value="payouts" className="shrink">
              Выдачи
            </TabsTrigger>
          </>
        ) : null}
        <TabsTrigger value="shifts" className="shrink">
          Смены
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4 min-w-0 space-y-4">
        <EmployeeProfileBody
          current={employee}
          detailLoading={false}
          stats={stats}
          statsLoading={statsLoading}
          hideShifts
        />
        <EmployeeTelegramBlock
          employeeId={employee.id}
          telegramId={employee.telegramId}
        />
        {canViewTasks ? (
          <EmployeeTasksBlock employeeId={employee.id} enabled={canViewTasks} />
        ) : null}
      </TabsContent>

      <TabsContent value="rates" className="mt-4 min-w-0">
        <EmployeeRatesSection employeeId={employee.id} canManage={canManageRates} />
      </TabsContent>

      {canViewPayroll ? (
        <>
          <TabsContent value="accruals" className="mt-4 min-w-0">
            <EmployeePayrollHistorySection
              employeeId={employee.id}
              canViewMoney={canViewPayroll}
              variant="accruals"
            />
          </TabsContent>
          <TabsContent value="payouts" className="mt-4 min-w-0">
            <EmployeePayrollHistorySection
              employeeId={employee.id}
              canViewMoney={canViewPayroll}
              variant="payouts"
            />
          </TabsContent>
        </>
      ) : null}

      <TabsContent value="shifts" className="mt-4 min-w-0">
        <EmployeeShiftsSection stats={stats} isLoading={statsLoading} />
      </TabsContent>
    </Tabs>
  )
}
