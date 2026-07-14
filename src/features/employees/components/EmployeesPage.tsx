import { Plus, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import type { Employee } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { useEmployees, useUpdateEmployee } from '@/features/employees/hooks'
import { EmployeeDetailSheet } from './EmployeeDetailSheet'
import { EmployeeFormModal } from './EmployeeFormModal'
import { EmployeesTable } from './EmployeesTable'
import type { EmployeeRowActions } from './employeesColumns'

export function EmployeesPage() {
  const { data: user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const { data: employees = [], isLoading, isError } = useEmployees()
  const updateEmployee = useUpdateEmployee()
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

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

  const handleToggleActive = useCallback(
    (employee: Employee) => {
      updateEmployee.mutate({
        id: employee.id,
        isActive: !employee.isActive,
      })
    },
    [updateEmployee],
  )

  const actions = useMemo<EmployeeRowActions | null>(() => {
    if (!isAdmin) return null
    return {
      onEdit: openEdit,
      onToggleActive: handleToggleActive,
    }
  }, [handleToggleActive, isAdmin, openEdit])

  useEffect(() => {
    if (isError) {
      toast.error('Ошибка: Не удалось загрузить сотрудников')
    }
  }, [isError])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Сотрудники</h1>
        {isAdmin ? (
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

      {isLoading ? (
        <SkeletonTable />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Сотрудников пока нет"
          description="Добавьте первого сотрудника, чтобы начать учёт рабочего времени"
          action={isAdmin ? { label: 'Добавить', onClick: openCreate } : undefined}
        />
      ) : (
        <EmployeesTable employees={employees} actions={actions} onRowClick={openDetails} />
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
    </div>
  )
}
