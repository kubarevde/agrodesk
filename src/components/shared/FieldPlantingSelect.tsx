import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import { useSeasonPlantingOverlays } from '@/features/fields/hooks'
import type { SeasonPlantingOverlay } from '@/features/fields/seasonPlantingTypes'

const NONE = '__none__'

type FieldPlantingSelectProps = {
  /** Restrict to these fields. Empty = all fields (optionally filtered by cropCode). */
  fieldIds?: string[]
  /** When set, only plantings of this crop. */
  cropCode?: string | null
  value: string | null | undefined
  onChange: (plantingId: string | null, planting: SeasonPlantingOverlay | null) => void
  label?: string
  disabled?: boolean
  seasonYear?: number
  /** Hide entirely when no plantings (default shows empty hint). */
  hideWhenEmpty?: boolean
}

function plantingLabel(row: SeasonPlantingOverlay, showField: boolean): string {
  const crop = row.cropName || row.cropCode
  const variety = row.varietyName ? ` · ${row.varietyName}` : ''
  const area = `${Number(row.areaHa.toFixed(2))} га`
  const field = showField && row.fieldName ? `${row.fieldName}: ` : ''
  return `${field}${crop}${variety} (${area})`
}

/** Optional planting picker (current season). */
export function FieldPlantingSelect({
  fieldIds,
  cropCode,
  value,
  onChange,
  label = 'Культура на поле (необязательно)',
  disabled,
  seasonYear,
  hideWhenEmpty = false,
}: FieldPlantingSelectProps) {
  const ids = useMemo(() => (fieldIds ?? []).filter(Boolean), [fieldIds])
  const crop = (cropCode ?? '').trim()
  const enabled = ids.length > 0 || Boolean(crop)
  const { data: overlays = [], isLoading } = useSeasonPlantingOverlays(seasonYear, {
    enabled,
  })

  const plantings = useMemo(() => {
    let rows = overlays
    if (ids.length > 0) {
      rows = rows.filter((row) => ids.includes(row.fieldId))
    }
    if (crop) {
      rows = rows.filter((row) => (row.cropCode ?? '').trim() === crop)
    }
    return rows
  }, [overlays, ids, crop])

  const showField = ids.length !== 1
  const options = useMemo(
    () =>
      selectOptions([
        { value: NONE, label: 'Не указано' },
        ...plantings.map((row) => ({
          value: row.id,
          label: plantingLabel(row, showField),
        })),
      ]),
    [plantings, showField],
  )

  if (!enabled) return null
  if (!isLoading && plantings.length === 0) {
    if (hideWhenEmpty) return null
    return (
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">
          Нет подходящих посевов в текущем сезоне. Можно указать культуру и сорт вручную.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <LabeledSelect
        value={value || NONE}
        onValueChange={(next) => {
          const id = !next || next === NONE ? null : next
          const planting = id ? (plantings.find((row) => row.id === id) ?? null) : null
          onChange(id, planting)
        }}
        options={options}
        placeholder={isLoading ? 'Загрузка…' : 'Не указано'}
        disabled={disabled || isLoading}
      />
      <p className="text-xs text-muted-foreground">
        Привязка к посеву подставит культуру и сорт. Необязательно.
      </p>
    </div>
  )
}
