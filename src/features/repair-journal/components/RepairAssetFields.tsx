import { Button } from '@/components/ui/button'
import { LabeledSelect } from '@/components/ui/labeled-select'
import type { SelectOption } from '@/lib/selectOptions'

type RepairAssetFieldsProps = {
  assetKind: 'equipment' | 'implement'
  onAssetKindChange: (kind: 'equipment' | 'implement') => void
  equipmentId: string
  implementId: string
  onEquipmentIdChange: (id: string) => void
  onImplementIdChange: (id: string) => void
  equipmentOptions: SelectOption[]
  implementOptions: SelectOption[]
  /** Locked card context: read-only label, no switch/select. */
  lockAsset?: boolean
  lockedLabel?: string | null
}

export function RepairAssetFields({
  assetKind,
  onAssetKindChange,
  equipmentId,
  implementId,
  onEquipmentIdChange,
  onImplementIdChange,
  equipmentOptions,
  implementOptions,
  lockAsset = false,
  lockedLabel,
}: RepairAssetFieldsProps) {
  if (lockAsset) {
    return (
      <div className="space-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {assetKind === 'equipment' ? 'Техника' : 'Приспособление'}
        </p>
        <p className="text-sm font-medium text-foreground">{lockedLabel ?? '—'}</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={assetKind === 'equipment' ? 'default' : 'outline'}
          onClick={() => onAssetKindChange('equipment')}
        >
          Техника
        </Button>
        <Button
          type="button"
          size="sm"
          variant={assetKind === 'implement' ? 'default' : 'outline'}
          onClick={() => onAssetKindChange('implement')}
        >
          Приспособление
        </Button>
      </div>
      {assetKind === 'equipment' ? (
        <LabeledSelect
          label="Техника"
          value={equipmentId}
          options={equipmentOptions}
          placeholder="Выберите технику"
          onValueChange={(v) => onEquipmentIdChange(v || '')}
        />
      ) : (
        <LabeledSelect
          label="Приспособление"
          value={implementId}
          options={implementOptions}
          placeholder="Выберите приспособление"
          onValueChange={(v) => onImplementIdChange(v || '')}
        />
      )}
    </>
  )
}
