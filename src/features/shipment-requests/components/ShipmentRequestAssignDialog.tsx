import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { useEmployees } from '@/features/employees/hooks'
import { selectOptions } from '@/lib/selectOptions'
import { useAssignShipmentRequest } from '../hooks'
import type { ShipmentRequest } from '../types'

type Props = {
  row: ShipmentRequest | null
  open: boolean
  onClose: () => void
}

/** Manager assign modal — employees who can execute (active staff). */
export function ShipmentRequestAssignDialog({ row, open, onClose }: Props) {
  const { data: employees = [] } = useEmployees({ enabled: open })
  const assign = useAssignShipmentRequest()
  const [employeeId, setEmployeeId] = useState('')

  const options = useMemo(
    () =>
      selectOptions(
        employees
          .filter((e) => e.isActive)
          .map((e) => ({
            value: e.id,
            label: `${e.employeeName}${e.role === 'employee' ? '' : ` (${e.role})`}`,
          })),
      ),
    [employees],
  )

  const handleClose = () => {
    setEmployeeId('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Назначить исполнителя</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Сотрудник</Label>
          <LabeledSelect
            value={employeeId || row?.assignedTo || ''}
            onValueChange={(value) => setEmployeeId(value ?? '')}
            options={options}
            placeholder="Выберите исполнителя"
          />
          {row ? (
            <p className="text-xs text-muted-foreground">
              Заявка: {row.inventoryItemName ?? 'ТМЦ'} · {row.customerName}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!row || !(employeeId || row?.assignedTo) || assign.isPending}
            onClick={() => {
              if (!row) return
              const assignedTo = employeeId || row.assignedTo
              if (!assignedTo) return
              assign.mutate(
                { id: row.id, assignedTo },
                { onSuccess: () => handleClose() },
              )
            }}
          >
            Назначить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
