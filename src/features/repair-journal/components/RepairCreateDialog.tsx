import { useEffect, useState } from 'react'
import { DatePicker } from '@/components/shared/DatePicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Textarea } from '@/components/ui/textarea'
import { selectOptions } from '@/lib/selectOptions'
import { useEquipment } from '@/features/equipment/hooks'
import { useImplements } from '@/features/implements/hooks'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useCreateRepair } from '../hooks'
import {
  CLOSED_REPAIR_STATUSES,
  isWaitingPartsStatus,
  STATUS_LABELS,
  WAITING_PARTS_STATUS,
} from '../lib/labels'
import type { RepairPriority, RepairStatus } from '../types'
import { RepairAssetFields } from './RepairAssetFields'
import {
  RepairChecklistDraft,
  type ChecklistDraftItem,
} from './RepairChecklistDraft'

type RepairCreateDialogProps = {
  open: boolean
  onClose: () => void
  defaultEquipmentId?: string
  defaultImplementId?: string
  /**
   * Equipment/implement card: asset fixed, no switch/select.
   * General maintenance journal must leave this false.
   */
  lockAsset?: boolean
}

const PRIORITY_OPTIONS = selectOptions([
  { value: 'urgent', label: 'Срочно' },
  { value: 'normal', label: 'Обычный' },
  { value: 'low', label: 'Низкий' },
])

const FALLBACK_CREATE_STATUSES = [
  { code: 'in_progress', name: STATUS_LABELS.in_progress },
  { code: WAITING_PARTS_STATUS, name: STATUS_LABELS.waiting_parts },
]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function RepairCreateDialog({
  open,
  onClose,
  defaultEquipmentId,
  defaultImplementId,
  lockAsset = false,
}: RepairCreateDialogProps) {
  const create = useCreateRepair()
  const { data: equipment = [] } = useEquipment({ is_active: true })
  const { data: implementsList = [] } = useImplements()
  const { data: statusDict = [] } = useDictionary('repair_status')

  const [assetKind, setAssetKind] = useState<'equipment' | 'implement'>('equipment')
  const [equipmentId, setEquipmentId] = useState('')
  const [implementId, setImplementId] = useState('')
  const [date, setDate] = useState(todayIso)
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<RepairPriority>('normal')
  const [status, setStatus] = useState<RepairStatus>('in_progress')
  const [extraWaiting, setExtraWaiting] = useState(false)
  const [items, setItems] = useState<ChecklistDraftItem[]>([])

  useEffect(() => {
    if (!open) return
    const kind: 'equipment' | 'implement' =
      defaultImplementId && !defaultEquipmentId ? 'implement' : 'equipment'
    setAssetKind(kind)
    setEquipmentId(defaultEquipmentId ?? '')
    setImplementId(defaultImplementId ?? '')
    setDate(todayIso())
    setDescription('')
    setPriority('normal')
    setStatus('in_progress')
    setExtraWaiting(false)
    setItems([])
  }, [open, defaultEquipmentId, defaultImplementId])

  const openStatuses = (statusDict.length > 0 ? statusDict : FALLBACK_CREATE_STATUSES).filter(
    (item) => !CLOSED_REPAIR_STATUSES.has(item.code),
  )
  const statusOptions = selectOptions(
    openStatuses.map((item) => ({ value: item.code, label: item.name })),
  )

  const equipmentOptions = selectOptions(
    equipment.map((item) => ({ value: item.id, label: item.name })),
  )
  const implementOptions = selectOptions(
    implementsList.map((item) => ({ value: item.id, label: item.name })),
  )

  const lockedLabel =
    assetKind === 'equipment'
      ? equipment.find((item) => item.id === equipmentId)?.name
      : implementsList.find((item) => item.id === implementId)?.name

  const handleSubmit = async () => {
    const eq = assetKind === 'equipment' ? equipmentId || null : null
    const impl = assetKind === 'implement' ? implementId || null : null
    if (!eq && !impl) return
    const waitingParts = isWaitingPartsStatus(status) || extraWaiting
    await create.mutateAsync({
      equipmentId: eq,
      implementId: impl,
      date,
      type: 'Ремонт',
      description: description.trim() || null,
      priority,
      status,
      waitingParts,
      checklistItems: items
        .filter((item) => item.description.trim())
        .map(({ itemType, description: text, cost }) => ({
          itemType,
          description: text.trim(),
          cost: cost ?? null,
        })),
    })
    onClose()
  }

  const canSubmit =
    !create.isPending &&
    (assetKind === 'equipment' ? Boolean(equipmentId) : Boolean(implementId))

  const submitLabel = isWaitingPartsStatus(status)
    ? 'Отметить ожидание запчастей'
    : 'Поставить на ремонт'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Постановка на ремонт</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <RepairAssetFields
            assetKind={assetKind}
            onAssetKindChange={setAssetKind}
            equipmentId={equipmentId}
            implementId={implementId}
            onEquipmentIdChange={setEquipmentId}
            onImplementIdChange={setImplementId}
            equipmentOptions={equipmentOptions}
            implementOptions={implementOptions}
            lockAsset={lockAsset}
            lockedLabel={lockedLabel}
          />

          <div className="space-y-1">
            <Label htmlFor="repair-date">Дата постановки</Label>
            <DatePicker
              id="repair-date"
              value={date}
              onChange={(next) => {
                if (next) setDate(next)
              }}
            />
          </div>

          <LabeledSelect
            label="Статус"
            value={status}
            options={statusOptions}
            onValueChange={(v) => {
              const next = (v as RepairStatus) || 'in_progress'
              setStatus(next)
              if (isWaitingPartsStatus(next)) setExtraWaiting(false)
            }}
          />

          {status === 'in_progress' ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={extraWaiting}
                onChange={(e) => setExtraWaiting(e.target.checked)}
              />
              Также ожидает запчасти
            </label>
          ) : null}

          <LabeledSelect
            label="Приоритет"
            value={priority}
            options={PRIORITY_OPTIONS}
            onValueChange={(v) => setPriority((v as RepairPriority) || 'normal')}
          />

          <div className="space-y-1">
            <Label htmlFor="repair-desc">Описание проблемы</Label>
            <Textarea
              id="repair-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <RepairChecklistDraft items={items} onChange={setItems} />

          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
