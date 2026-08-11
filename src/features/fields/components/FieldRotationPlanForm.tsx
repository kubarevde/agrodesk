import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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
import type { RotationPlanWrite } from '../rotationTypes'

type FieldRotationPlanFormProps = {
  defaultSeasonYear: number
  pending: boolean
  onCancel: () => void
  onSubmit: (payload: RotationPlanWrite) => void
}

export function FieldRotationPlanForm({
  defaultSeasonYear,
  pending,
  onCancel,
  onSubmit,
}: FieldRotationPlanFormProps) {
  const { data: crops = [] } = useDictionary('crop', { activeOnly: true })
  const [cropCode, setCropCode] = useState('')
  const [varietyId, setVarietyId] = useState<string | null>(null)
  const [area, setArea] = useState('')
  const [seasonYear, setSeasonYear] = useState(String(defaultSeasonYear))
  const [plantAt, setPlantAt] = useState('')
  const [harvestAt, setHarvestAt] = useState('')
  const [comment, setComment] = useState('')
  const { data: varieties = [] } = useCropVarieties(cropCode || null, {
    activeOnly: true,
    enabled: Boolean(cropCode),
  })

  useEffect(() => {
    setSeasonYear(String(defaultSeasonYear))
  }, [defaultSeasonYear])

  const areaNum = Number(String(area).replace(',', '.'))
  const canSave = Boolean(cropCode) && Number.isFinite(areaNum) && areaNum > 0 && !pending

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">План на год</p>
      <div className="space-y-2">
        <Label>Культура</Label>
        <Select
          value={cropCode || null}
          onValueChange={(v) => {
            setCropCode(v ?? '')
            setVarietyId(null)
          }}
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
      </div>
      {varieties.length > 0 ? (
        <div className="space-y-2">
          <Label>Сорт (необязательно)</Label>
          <Select
            value={varietyId || '__none__'}
            onValueChange={(v) => setVarietyId(!v || v === '__none__' ? null : v)}
            items={[
              { value: '__none__', label: 'Без сорта' },
              ...varieties.map((v) => ({ value: v.id, label: v.name })),
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Без сорта" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="__none__">Без сорта</SelectItem>
              {varieties.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rot-area">Площадь, га</Label>
          <Input
            id="rot-area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rot-year">Год</Label>
          <Input
            id="rot-year"
            type="number"
            value={seasonYear}
            onChange={(e) => setSeasonYear(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>План посева</Label>
          <DatePicker
            value={plantAt || undefined}
            onChange={(iso) => setPlantAt(iso ?? '')}
            placeholder="Необязательно"
          />
        </div>
        <div className="space-y-2">
          <Label>План уборки</Label>
          <DatePicker
            value={harvestAt || undefined}
            onChange={(iso) => setHarvestAt(iso ?? '')}
            placeholder="Необязательно"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rot-comment">Комментарий</Label>
        <Textarea
          id="rot-comment"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <p className="flex gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        При повторной культуре подряд появится предупреждение — сохранение не блокируется.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
          disabled={!canSave}
          onClick={() => {
            const year = Number(seasonYear)
            if (!Number.isFinite(year)) return
            onSubmit({
              crop_code: cropCode,
              variety_id: varietyId,
              area_ha: areaNum,
              season_year: year,
              planned_plant_at: plantAt || null,
              planned_harvest_at: harvestAt || null,
              comment: comment.trim() || null,
            })
          }}
        >
          Сохранить план
        </Button>
      </div>
    </div>
  )
}
