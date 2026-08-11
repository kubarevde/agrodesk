import { RegionSelect } from '@/components/shared/RegionSelect'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ExternalOrgAdmin } from '../api'

interface ExternalOrgsPickerProps {
  orgQuery: string
  onOrgQueryChange: (value: string) => void
  region: string | null
  onRegionChange: (value: string | null) => void
  peerId: string
  onPeerIdChange: (value: string) => void
  rows: ExternalOrgAdmin[]
  loading: boolean
  isError: boolean
}

export function ExternalOrgsPicker({
  orgQuery,
  onOrgQueryChange,
  region,
  onRegionChange,
  peerId,
  onPeerIdChange,
  rows,
  loading,
  isError,
}: ExternalOrgsPickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Только администраторы других организаций. Общего чата «для всех» нет — выберите
        конкретное хозяйство.
      </p>
      <div className="space-y-2">
        <Label htmlFor="org-search">Поиск по названию</Label>
        <Input
          id="org-search"
          value={orgQuery}
          onChange={(e) => onOrgQueryChange(e.target.value)}
          placeholder="Название хозяйства или ФИО админа"
          className="min-h-11"
        />
      </div>
      <RegionSelect
        label="Регион"
        value={region}
        onValueChange={onRegionChange}
        emptyLabel="Все регионы"
        placeholder="Все регионы"
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Поиск хозяйств…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Не удалось загрузить список хозяйств. Обновите страницу или перезапустите API.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {region
            ? 'В выбранном регионе нет других хозяйств с администратором'
            : 'Никого не найдено'}
        </p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {rows.map((row) => (
            <li key={`${row.orgId}-${row.adminId}`}>
              <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="external-peer"
                  className="mt-1 size-4 accent-primary"
                  checked={peerId === row.adminId}
                  onChange={() => onPeerIdChange(row.adminId)}
                />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{row.orgName}</span>
                  <span className="block text-muted-foreground">
                    {row.adminName}
                    {row.regionLabel ? ` · ${row.regionLabel}` : ''}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
