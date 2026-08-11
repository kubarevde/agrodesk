import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOrganizationSettings, useUpdateOrganizationSettings } from '../hooks'
import { formatOrgDateTime } from '@/lib/timezone'
import { PayrollVisibilityToggle } from './PayrollVisibilityToggle'

/**
 * Full catalog for the org timezone select (aligned with backend AVAILABLE_TIMEZONES).
 * Always drive the dropdown from this list — do not rely on a possibly stale API array.
 */
const TIMEZONE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Europe/Volgograd', label: 'Волгоград (UTC+3)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Barnaul', label: 'Барнаул (UTC+7)' },
  { value: 'Asia/Tomsk', label: 'Томск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Chita', label: 'Чита (UTC+9)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Sakhalin', label: 'Сахалин (UTC+11)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Srednekolymsk', label: 'Среднеколымск (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
  { value: 'Asia/Anadyr', label: 'Анадырь (UTC+12)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Europe/Kyiv', label: 'Киев (UTC+2)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+5)' },
  { value: 'Asia/Qostanay', label: 'Костанай (UTC+5)' },
  { value: 'Asia/Aqtobe', label: 'Актобе (UTC+5)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { value: 'Asia/Samarkand', label: 'Самарканд (UTC+5)' },
  { value: 'Asia/Bishkek', label: 'Бишкек (UTC+6)' },
  { value: 'Asia/Dushanbe', label: 'Душанбе (UTC+5)' },
  { value: 'Asia/Ashgabat', label: 'Ашхабад (UTC+5)' },
  { value: 'Asia/Baku', label: 'Баку (UTC+4)' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси (UTC+4)' },
  { value: 'Asia/Yerevan', label: 'Ереван (UTC+4)' },
  { value: 'Asia/Bangkok', label: 'Бангкок (UTC+7)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Хошимин (UTC+7)' },
  { value: 'UTC', label: 'UTC' },
]

export function TimezoneTab() {
  const { data, isLoading, isError } = useOrganizationSettings()
  const update = useUpdateOrganizationSettings()
  const [timezone, setTimezone] = useState('Asia/Bangkok')

  useEffect(() => {
    if (data?.timezone) setTimezone(data.timezone)
  }, [data])

  const options = useMemo(() => {
    const known = new Set(TIMEZONE_OPTIONS.map((row) => row.value))
    if (timezone && !known.has(timezone)) {
      return [{ value: timezone, label: timezone }, ...TIMEZONE_OPTIONS]
    }
    return [...TIMEZONE_OPTIONS]
  }, [timezone])

  if (isLoading) return <PageSkeleton />
  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить настройки организации. Нужны права администратора.
      </p>
    )
  }

  const dirty = timezone !== data.timezone

  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
        <div className="space-y-2">
          <Label>Часовой пояс организации</Label>
          <Select
            value={timezone}
            onValueChange={(value) => {
              if (value) setTimezone(value)
            }}
            items={options}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите пояс" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {options.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Используется для дат смен, ТО, уведомлений и отчётов. Сейчас в выбранном поясе:{' '}
            <span className="font-medium text-foreground">
              {formatOrgDateTime(new Date(), timezone)}
            </span>
          </p>
        </div>

        <Button
          type="button"
          disabled={update.isPending || !dirty}
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
          onClick={() => void update.mutateAsync({ timezone })}
        >
          {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Сохранить
        </Button>
      </div>

      <PayrollVisibilityToggle
        value={data.payrollVisibleToEmployees}
        disabled={update.isPending}
        onChange={(next) => void update.mutateAsync({ payrollVisibleToEmployees: next })}
      />
    </div>
  )
}
