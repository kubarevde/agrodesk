import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import { useEmployees } from '@/features/employees/hooks'
import { useInventory } from '@/features/inventory/hooks'
import { useCreateShipmentRequest } from '../hooks'
import { defaultPlannedAtIso } from '../labels'
import {
  selectableInventoryItemsForRequest,
  shipmentRequestItemOptionLabel,
} from '../itemSelect'
import type { ShipmentRequestPriority } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  /** Preselect ТМЦ (e.g. from inventory card). */
  initialInventoryItemId?: string | null
}

const PRIORITY_OPTIONS = selectOptions([
  { value: 'normal', label: 'Обычный' },
  { value: 'urgent', label: 'Срочный' },
])

const NONE_ASSIGNEE = 'none'

export function ShipmentRequestFormDialog({
  open,
  onClose,
  initialInventoryItemId = null,
}: Props) {
  const { data: items = [], isLoading } = useInventory({ enabled: open })
  const { data: employees = [] } = useEmployees({ enabled: open })
  const create = useCreateShipmentRequest()
  const [inventoryItemId, setInventoryItemId] = useState(initialInventoryItemId ?? '')
  const [customerName, setCustomerName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [plannedLocal, setPlannedLocal] = useState('')
  const [priority, setPriority] = useState<ShipmentRequestPriority>('normal')
  const [assignedTo, setAssignedTo] = useState(NONE_ASSIGNEE)

  useEffect(() => {
    if (!open) return
    setInventoryItemId(initialInventoryItemId ?? '')
    setCustomerName('')
    setQuantity('')
    setPrice('')
    setPriority('normal')
    setAssignedTo(NONE_ASSIGNEE)
    const iso = defaultPlannedAtIso()
    const local = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    setPlannedLocal(
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`,
    )
  }, [open, initialInventoryItemId])

  const selectedItem = useMemo(
    () => items.find((item) => item.id === inventoryItemId) ?? null,
    [items, inventoryItemId],
  )
  const availableStock = selectedItem?.currentStock ?? null
  const qtyNum = Number(quantity)
  const overStock =
    availableStock != null && Number.isFinite(qtyNum) && qtyNum > availableStock
  const unit = (selectedItem?.unit ?? '').trim()
  const quantityLabel =
    !unit || unit === 'кг' ? 'Количество, кг' : `Количество, ${unit}`
  const priceLabel =
    !unit || unit === 'кг' ? 'Цена за килограмм' : `Цена за ${unit}`

  const itemOptions = selectOptions(
    selectableInventoryItemsForRequest(items).map((item) => ({
      value: item.id,
      label: shipmentRequestItemOptionLabel(item),
    })),
  )
  const employeeOptions = selectOptions([
    { value: NONE_ASSIGNEE, label: 'Не назначен' },
    ...employees
      .filter((row) => row.isActive)
      .map((row) => ({
        value: row.id,
        label: `${row.employeeName}${row.role === 'employee' ? '' : ` (${row.role})`}`,
      })),
  ])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const qty = Number(quantity)
    const priceNum = Number(price)
    if (!inventoryItemId || !customerName.trim() || !(qty > 0) || !(priceNum >= 0) || !plannedLocal) {
      return
    }
    if (overStock) return
    await create.mutateAsync({
      inventoryItemId,
      customerName: customerName.trim(),
      quantity: qty,
      price: priceNum,
      plannedAt: new Date(plannedLocal).toISOString(),
      priority,
      assignedTo: assignedTo === NONE_ASSIGNEE ? null : assignedTo,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Заявка на отгрузку ТМЦ</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label>ТМЦ</Label>
            <LabeledSelect
              value={inventoryItemId}
              onValueChange={(value) => setInventoryItemId(value ?? '')}
              options={itemOptions}
              placeholder={isLoading ? 'Загрузка…' : 'Выберите позицию'}
              disabled={Boolean(initialInventoryItemId)}
            />
            {selectedItem ? (
              <p className="text-xs text-muted-foreground">
                Доступно: {selectedItem.currentStock.toLocaleString('ru-RU')} {selectedItem.unit}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-customer">Покупатель</Label>
            <Input
              id="sr-customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="ООО / ФИО"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sr-qty">{quantityLabel}</Label>
              <Input
                id="sr-qty"
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-invalid={overStock}
                required
              />
              {overStock && availableStock != null ? (
                <p className="text-xs text-destructive">
                  Максимум {availableStock.toLocaleString('ru-RU')}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sr-price">{priceLabel}</Label>
              <Input
                id="sr-price"
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-planned">План выполнения</Label>
            <Input
              id="sr-planned"
              type="datetime-local"
              value={plannedLocal}
              onChange={(e) => setPlannedLocal(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Приоритет</Label>
            <LabeledSelect
              value={priority}
              onValueChange={(value) =>
                setPriority((value as ShipmentRequestPriority) || 'normal')
              }
              options={PRIORITY_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label>Ответственный</Label>
            <LabeledSelect
              value={assignedTo}
              onValueChange={(value) => setAssignedTo(value ?? NONE_ASSIGNEE)}
              options={employeeOptions}
              placeholder="Не назначен"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending || overStock}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
