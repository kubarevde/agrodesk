import { useEffect, useMemo, useState } from 'react'
import { DatePicker } from '@/components/shared/DatePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useCropVarieties } from '@/features/dictionaries/cropVarietyHooks'
import { normalizePolygon, polygonAreaHa } from '../geometry'
import { validatePlantingContour } from '../plantingContourValidation'
import type { FieldResponse } from '../types'
import type { FieldPlanting, PlantingStatus } from '../plantingTypes'
import { PLANTING_STATUS_LABELS } from '../plantingTypes'
import {
  DEFAULT_PLANTING_MAP_COLOR,
  PLANTING_MAP_COLOR_OPTIONS,
  normalizePlantingMapColor,
} from '../plantingColors'
import { FieldPlantingMapEditor } from './FieldPlantingMapEditor'

export type FieldPlantingFormPayload = {
  crop_code: string
  variety_id: string | null
  clear_variety?: boolean
  area_ha: number
  planted_at: string | null
  status: PlantingStatus
  season_year: number
  comment: string | null
  polygon: number[][] | null
  map_color: string
  occupies_whole_field?: boolean
}

type FieldPlantingFormPanelProps = {
  field: FieldResponse
  editing: FieldPlanting | null
  /** Sibling plantings already on the field (shown on map). */
  otherPlantings?: FieldPlanting[]
  remainingHa: number | null
  defaultSeasonYear: number
  pending: boolean
  onCancel: () => void
  onSubmit: (payload: FieldPlantingFormPayload) => void
}

/** Inline form inside field sheet — avoids Dialog under Sheet z-index. */
export function FieldPlantingFormPanel({
  field,
  editing,
  otherPlantings = [],
  remainingHa,
  defaultSeasonYear,
  pending,
  onCancel,
  onSubmit,
}: FieldPlantingFormPanelProps) {
  const { data: crops = [] } = useDictionary('crop', { activeOnly: true })
  const [cropCode, setCropCode] = useState('')
  const [varietyId, setVarietyId] = useState<string | null>(null)
  const [area, setArea] = useState('')
  const [plantedAt, setPlantedAt] = useState('')
  const [status, setStatus] = useState<PlantingStatus>('planted')
  const [seasonYear, setSeasonYear] = useState(String(defaultSeasonYear))
  const [comment, setComment] = useState('')
  const [polygon, setPolygon] = useState<number[][] | null>(null)
  const [mapColor, setMapColor] = useState(DEFAULT_PLANTING_MAP_COLOR)
  const [showMap, setShowMap] = useState(Boolean(field.polygon && field.polygon.length >= 3))
  const [occupiesWholeField, setOccupiesWholeField] = useState(false)
  const cropLocked = Boolean(editing?.cropLocked)
  const { data: varieties = [] } = useCropVarieties(cropCode || null, {
    activeOnly: true,
    enabled: Boolean(cropCode),
  })

  const seasonYearNum = Number(seasonYear)
  const seasonSiblings = useMemo(
    () =>
      otherPlantings.filter(
        (row) =>
          row.status !== 'cancelled' &&
          (!Number.isFinite(seasonYearNum) || row.seasonYear === seasonYearNum),
      ),
    [otherPlantings, seasonYearNum],
  )

  useEffect(() => {
    if (editing) {
      setCropCode(editing.cropCode)
      setVarietyId(editing.varietyId)
      setArea(String(editing.areaHa))
      setPlantedAt(editing.plantedAt ?? '')
      setStatus(editing.status)
      setSeasonYear(String(editing.seasonYear))
      setComment(editing.comment ?? '')
      setPolygon(editing.polygon)
      setMapColor(normalizePlantingMapColor(editing.mapColor))
      setShowMap(Boolean(field.polygon && field.polygon.length >= 3))
      setOccupiesWholeField(false)
    } else {
      setCropCode('')
      setVarietyId(null)
      setArea('')
      setPlantedAt('')
      setStatus('planted')
      setSeasonYear(String(defaultSeasonYear))
      setComment('')
      setPolygon(null)
      setMapColor(DEFAULT_PLANTING_MAP_COLOR)
      setShowMap(Boolean(field.polygon && field.polygon.length >= 3))
      setOccupiesWholeField(false)
    }
  }, [editing, defaultSeasonYear, field.polygon])

  const geometryError = useMemo(() => {
    const result = validatePlantingContour({
      fieldPolygon: field.polygon,
      plantingPolygon: occupiesWholeField ? null : polygon,
      siblings: seasonSiblings.map((row) => ({
        id: row.id,
        label: row.cropName || row.cropCode,
        polygon: row.polygon,
      })),
      occupiesWholeField,
    })
    return result?.message ?? null
  }, [field.polygon, polygon, seasonSiblings, occupiesWholeField])

  const areaNum = Number(String(area).replace(',', '.'))
  const canSave =
    Boolean(cropCode) &&
    Number.isFinite(areaNum) &&
    areaNum > 0 &&
    !pending &&
    !geometryError

  const applyWholeField = (checked: boolean) => {
    setOccupiesWholeField(checked)
    if (checked) {
      const ring = normalizePolygon(field.polygon)
      if (ring) {
        setPolygon(ring)
        setArea(String(polygonAreaHa(ring)))
        setShowMap(true)
      }
    } else {
      setPolygon(null)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">
        {editing ? 'Изменить культуру' : 'Добавить культуру'}
      </p>
      {remainingHa != null && !editing ? (
        <p className="text-xs text-muted-foreground">
          Доступный остаток площади: {remainingHa.toFixed(2)} га
        </p>
      ) : null}

      <div className="space-y-2">
        <Label>Культура</Label>
        <Select
          value={cropCode || null}
          onValueChange={(value) => {
            setCropCode(value ?? '')
            setVarietyId(null)
          }}
          disabled={cropLocked}
          items={crops.map((c) => ({ value: c.code, label: c.name }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выберите культуру" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {crops.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {cropLocked ? (
          <p className="text-xs text-muted-foreground">
            Культуру и сорт нельзя менять: уже есть сбор урожая.
          </p>
        ) : null}
      </div>

      {cropCode ? (
        <div className="space-y-2">
          <Label>Сорт (необязательно)</Label>
          <Select
            value={varietyId ?? ''}
            onValueChange={(value) => setVarietyId(value ? value : null)}
            disabled={cropLocked}
            items={[
              { value: '', label: 'Сорт не указан' },
              ...varieties.map((v) => ({ value: v.id, label: v.name })),
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Сорт не указан" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="">Сорт не указан</SelectItem>
              {varieties.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="planting-area">Площадь, га</Label>
        <Input
          id="planting-area"
          inputMode="decimal"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Например: 2,5"
          disabled={occupiesWholeField || Boolean(polygon && polygon.length >= 3)}
        />
        {polygon && polygon.length >= 3 && !occupiesWholeField ? (
          <p className="text-xs text-muted-foreground">
            Площадь берётся из нарисованного контура.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="planting-date">Дата посева</Label>
          <DatePicker
            id="planting-date"
            value={plantedAt || undefined}
            onChange={(iso) => setPlantedAt(iso ?? '')}
            placeholder="Выберите дату"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="planting-year">Сезон (год)</Label>
          <Input
            id="planting-year"
            type="number"
            value={seasonYear}
            onChange={(e) => setSeasonYear(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Статус</Label>
        <Select
          value={status}
          onValueChange={(value) => setStatus((value as PlantingStatus) ?? 'planted')}
          items={Object.entries(PLANTING_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {Object.entries(PLANTING_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="planting-comment">Комментарий</Label>
        <Textarea
          id="planting-comment"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Например: северный клин"
        />
      </div>

      {field.polygon && field.polygon.length >= 3 ? (
        <div className="space-y-2">
          <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm sm:min-h-0">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={occupiesWholeField}
              onChange={(e) => applyWholeField(e.target.checked)}
            />
            <span>
              <span className="font-medium text-foreground">Занимает всё поле</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Контур культуры совпадёт с контуром поля. Недоступно, если на поле уже есть
                другие посевы этого сезона.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <Label>Цвет на карте</Label>
            <div className="flex flex-wrap gap-2">
              {PLANTING_MAP_COLOR_OPTIONS.map((option) => {
                const selected = mapColor === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={selected}
                    className={`size-9 rounded-full border-2 ${option.swatchClass} ${
                      selected ? 'border-foreground ring-2 ring-foreground/20' : 'border-border'
                    }`}
                    onClick={() => setMapColor(option.value)}
                  />
                )
              })}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={occupiesWholeField}
            onClick={() => setShowMap((v) => !v)}
          >
            {showMap ? 'Скрыть карту участка' : 'Участок на карте поля'}
          </Button>
          {showMap && !occupiesWholeField ? (
            <FieldPlantingMapEditor
              fieldPolygon={field.polygon}
              value={polygon}
              pathColor={mapColor}
              otherPlantings={seasonSiblings}
              geometryError={geometryError}
              onChange={(next, meta) => {
                setPolygon(next)
                if (meta?.areaHa != null && meta.areaHa > 0) {
                  setArea(String(meta.areaHa))
                } else if (!next) {
                  setArea('')
                }
              }}
            />
          ) : null}
          {occupiesWholeField && geometryError ? (
            <p className="text-sm text-destructive" role="alert">
              {geometryError}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Цвет на карте</Label>
          <div className="flex flex-wrap gap-2">
            {PLANTING_MAP_COLOR_OPTIONS.map((option) => {
              const selected = mapColor === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={selected}
                  className={`size-9 rounded-full border-2 ${option.swatchClass} ${
                    selected ? 'border-foreground ring-2 ring-foreground/20' : 'border-border'
                  }`}
                  onClick={() => setMapColor(option.value)}
                />
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Контур поля не задан — цвет сохранится для карты, когда участок нарисуют позже.
          </p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:min-h-10 sm:w-auto"
          onClick={onCancel}
        >
          Отмена
        </Button>
        <Button
          type="button"
          className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10 sm:w-auto"
          disabled={!canSave}
          onClick={() => {
            const year = Number(seasonYear)
            if (!Number.isFinite(year)) return
            onSubmit({
              crop_code: cropCode,
              variety_id: varietyId,
              clear_variety: Boolean(editing && editing.varietyId && !varietyId),
              area_ha: areaNum,
              planted_at: plantedAt || null,
              status,
              season_year: year,
              comment: comment.trim() || null,
              polygon: occupiesWholeField ? null : polygon,
              map_color: mapColor,
              occupies_whole_field: occupiesWholeField,
            })
          }}
        >
          Сохранить
        </Button>
      </div>
    </div>
  )
}
