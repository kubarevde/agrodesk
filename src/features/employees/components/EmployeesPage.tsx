import { Plus, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [toggleTarget, setToggleTarget] = useState<Employee | null>(null)

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
    return {
      onEdit: openEdit,
      onToggleActive: setToggleTarget,
    }
  }, [isAdmin, openEdit])

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

      <Dialog open={Boolean(toggleTarget)} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {toggleTarget?.isActive ? 'Деактивировать сотрудника?' : 'Активировать сотрудника?'}
            </DialogTitle>
            <DialogDescription>
              {toggleTarget
                ? `${toggleTarget.employeeName} (${toggleTarget.employeeCode})`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setToggleTarget(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant={toggleTarget?.isActive ? 'destructive' : 'default'}
              className={
                toggleTarget?.isActive
                  ? undefined
                  : 'bg-primary hover:bg-primary-hover text-primary-foreground'
              }
              disabled={updateEmployee.isPending}
              onClick={() => void confirmToggleActive()}
            >
              {toggleTarget?.isActive ? 'Деактивировать' : 'Активировать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
