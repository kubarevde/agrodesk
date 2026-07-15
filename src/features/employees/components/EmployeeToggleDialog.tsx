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

interface EmployeeToggleDialogProps {
  employee: Employee | null
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function EmployeeToggleDialog({
  employee,
  pending,
  onClose,
  onConfirm,
}: EmployeeToggleDialogProps) {
  return (
    <Dialog open={Boolean(employee)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {employee?.isActive ? 'Деактивировать сотрудника?' : 'Активировать сотрудника?'}
          </DialogTitle>
          <DialogDescription>
            {employee ? `${employee.employeeName} (${employee.employeeCode})` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            variant={employee?.isActive ? 'destructive' : 'default'}
            className={
              employee?.isActive
                ? undefined
                : 'bg-primary hover:bg-primary-hover text-primary-foreground'
            }
            disabled={pending}
            onClick={onConfirm}
          >
            {employee?.isActive ? 'Деактивировать' : 'Активировать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
