import { Plus, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import type { Employee } from '@/types'
import { useDeactivateEmployee, useEmployeesList } from '@/features/employees/hooks'
import { EmployeeDetailSheet } from './EmployeeDetailSheet'
import { EmployeeFormModal } from './EmployeeFormModal'
import { EmployeesTable } from './EmployeesTable'

export function EmployeesPage() {
  const { data: employees = [], isLoading, isError } = useEmployeesList()
  const deactivateEmployee = useDeactivateEmployee()
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

  const handleDeactivate = useCallback(
    (employee: Employee) => {
      deactivateEmployee.mutate(employee.id)
    },
    [deactivateEmployee],
  )

  const actions = {
    onEdit: openEdit,
    onDeactivate: handleDeactivate,
  }

  useEffect(() => {
    if (isError) {
      toast.error('Не удалось загрузить сотрудников')
    }
  }, [isError])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Сотрудники</h1>
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          Добавить сотрудника
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} columns={8} />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Сотрудников пока нет"
          description="Добавьте первого сотрудника, чтобы начать учёт рабочего времени"
          action={{ label: 'Добавить сотрудника', onClick: openCreate }}
        />
      ) : (
        <EmployeesTable employees={employees} actions={actions} onRowClick={openDetails} />
      )}

      <EmployeeDetailSheet
        employee={selectedEmployee}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      <EmployeeFormModal
        open={formOpen}
        employee={editingEmployee}
        onClose={() => {
          setFormOpen(false)
          setEditingEmployee(null)
        }}
      />
    </div>
  )
}
