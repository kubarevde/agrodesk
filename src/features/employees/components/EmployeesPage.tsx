import { getRouteApi } from '@tanstack/react-router'
import { Plus, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Employee } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { useEmployees, useUpdateEmployee } from '@/features/employees/hooks'
import { useAllEmployeeRates } from '@/features/employees/salaryHooks'
import { employeesHelp } from '@/features/help/content'
import { EmployeeDetailSheet } from './EmployeeDetailSheet'
import { EmployeeFormModal } from './EmployeeFormModal'
import { EmployeeToggleDialog } from './EmployeeToggleDialog'
import { EmployeesTable } from './EmployeesTable'
import { SalaryCalcTab } from './SalaryCalcTab'
import type { EmployeeRowActions } from './employeesColumns'

const employeesRoute = getRouteApi('/_layout/employees/')

export function EmployeesPage() {
  const { tab } = employeesRoute.useSearch()
  const navigate = employeesRoute.useNavigate()
  const { data: user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const canManage = user?.role === 'manager' || user?.role === 'admin'
  const { data: employees = [], isLoading, isError } = useEmployees()
  const { data: allRates = [] } = useAllEmployeeRates(canManage)
  const updateEmployee = useUpdateEmployee()
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Employee | null>(null)

  const employeeIdsWithRates = useMemo(
    () => new Set(allRates.map((rate) => rate.employeeId)),
    [allRates],
  )

  const openDetails = useCallback((employee: Employee) => {
    setSelectedEmployee(employee)
    setDetailOpen(true)
  }, [])

  const openCreate = () => {
    setEditingEmployee(null)
    setFormOpen(true)
  }

  const openEdit = useCallback((employee: Employee) => {
    setEditingEmployee(employee)
    setFormOpen(true)
  }, [])

  const confirmToggleActive = async () => {
    if (!toggleTarget) return
    await updateEmployee.mutateAsync({
      id: toggleTarget.id,
      isActive: !toggleTarget.isActive,
    })
    setToggleTarget(null)
  }

  const actions = useMemo<EmployeeRowActions | null>(() => {
    if (!isAdmin) return null
    return { onEdit: openEdit, onToggleActive: setToggleTarget }
  }, [isAdmin, openEdit])

  useEffect(() => {
    if (isError) toast.error('Ошибка: Не удалось загрузить сотрудников')
  }, [isError])

  const listContent =
    isLoading ? (
      <SkeletonTable />
    ) : employees.length === 0 ? (
      <EmptyState
        icon={Users}
        title="Сотрудников пока нет"
        description="Добавьте первого сотрудника, чтобы начать учёт рабочего времени"
        action={isAdmin ? { label: 'Добавить', onClick: openCreate } : undefined}
      />
    ) : (
      <EmployeesTable
        employees={employees}
        actions={actions}
        onRowClick={openDetails}
        employeeIdsWithRates={employeeIdsWithRates}
      />
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Сотрудники</h1>
        {isAdmin && tab === 'list' ? (
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Добавить
          </Button>
        ) : null}
      </div>

      {canManage ? (
        <Tabs
          value={tab}
          onValueChange={(value) =>
            void navigate({ search: { tab: value === 'salary' ? 'salary' : 'list' } })
          }
        >
          <TabsList>
            <TabsTrigger value="list">Сотрудники</TabsTrigger>
            <TabsTrigger value="salary">Расчёт ЗП</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4 space-y-4">
            <SectionHelp title="Справка: сотрудники и ставки" items={employeesHelp} />
            {listContent}
          </TabsContent>
          <TabsContent value="salary" className="mt-4">
            <SalaryCalcTab />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <SectionHelp title="Справка: сотрудники и ставки" items={employeesHelp} />
          {listContent}
        </div>
      )}

      <EmployeeDetailSheet
        employee={selectedEmployee}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {isAdmin ? (
        <EmployeeFormModal
          key={editingEmployee?.id ?? 'create'}
          open={formOpen}
          employee={editingEmployee}
          onClose={() => {
            setFormOpen(false)
            setEditingEmployee(null)
          }}
        />
      ) : null}

      <EmployeeToggleDialog
        employee={toggleTarget}
        pending={updateEmployee.isPending}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => void confirmToggleActive()}
      />
    </div>
  )
}
