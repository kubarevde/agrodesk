import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import {
  useEmployee,
  useEmployeeMonthStats,
  useUpdateEmployee,
} from '@/features/employees/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { hasAction } from '@/lib/permissionActions'
import { EmployeeDetailHeader } from './EmployeeDetailHeader'
import { EmployeeDetailTabs } from './EmployeeDetailTabs'
import { EmployeeFormModal } from './EmployeeFormModal'
import { EmployeeToggleDialog } from './EmployeeToggleDialog'

type EmployeeDetailPageProps = {
  employeeId: string
}

export function EmployeeDetailPage({ employeeId }: EmployeeDetailPageProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const isAdmin = user?.role === 'admin'
  const canManageRates = hasAction(perms?.actions, 'payroll.manage_rates', user?.role)
  const canViewPayroll = hasAction(perms?.actions, 'payroll.view_all', user?.role)
  const canViewTasks = hasAction(perms?.actions, 'tasks.view_all', user?.role)

  const { data: employee, isLoading, isError } = useEmployee(employeeId)
  const { data: stats, isLoading: statsLoading } = useEmployeeMonthStats(employeeId)
  const updateEmployee = useUpdateEmployee()

  const [editOpen, setEditOpen] = useState(false)
  const [toggleOpen, setToggleOpen] = useState(false)

  const goList = () =>
    void navigate({
      to: '/employees',
      search: { tab: 'list', payroll: undefined, runId: undefined },
    })

  if (isLoading) return <PageSkeleton />
  if (isError || !employee) {
    return (
      <EmptyState
        icon={Users}
        title="Сотрудник не найден"
        description="Проверьте ссылку или вернитесь к списку."
        action={{ label: 'К списку', onClick: goList }}
      />
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      <Button
        type="button"
        variant="ghost"
        className="gap-2 px-0 text-muted-foreground"
        onClick={goList}
      >
        <ArrowLeft className="size-4" />
        К списку сотрудников
      </Button>

      <EmployeeDetailHeader
        employee={employee}
        isAdmin={isAdmin}
        onEdit={() => setEditOpen(true)}
        onToggleActive={() => setToggleOpen(true)}
      />

      <EmployeeDetailTabs
        employee={employee}
        stats={stats}
        statsLoading={statsLoading}
        canManageRates={canManageRates}
        canViewPayroll={canViewPayroll}
        canViewTasks={canViewTasks}
      />

      {isAdmin ? (
        <EmployeeFormModal
          key={employee.id}
          open={editOpen}
          employee={employee}
          onClose={() => setEditOpen(false)}
        />
      ) : null}

      <EmployeeToggleDialog
        employee={toggleOpen ? employee : null}
        pending={updateEmployee.isPending}
        onClose={() => setToggleOpen(false)}
        onConfirm={() => {
          void updateEmployee
            .mutateAsync({ id: employee.id, isActive: !employee.isActive })
            .then(() => setToggleOpen(false))
        }}
      />
    </div>
  )
}
