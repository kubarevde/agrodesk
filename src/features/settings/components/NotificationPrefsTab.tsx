import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STORAGE_KEY = 'agrodesk_notification_prefs'

export type NotificationPrefs = {
  toWarning: boolean
  toOverdue: boolean
  sharingNewRequests: boolean
  sharingRequestDecision: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  toWarning: true,
  toOverdue: true,
  sharingNewRequests: true,
  sharingRequestDecision: true,
}

function loadPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>
    return {
      toWarning: parsed.toWarning ?? true,
      toOverdue: parsed.toOverdue ?? true,
      sharingNewRequests: parsed.sharingNewRequests ?? true,
      sharingRequestDecision: parsed.sharingRequestDecision ?? true,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function PrefToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border px-3 py-3">
      <div className="space-y-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={
          value
            ? 'relative h-6 w-11 shrink-0 rounded-full bg-success transition-colors'
            : 'relative h-6 w-11 shrink-0 rounded-full bg-muted transition-colors'
        }
      >
        <span
          className={
            value
              ? 'absolute top-0.5 left-5 size-5 rounded-full bg-white shadow transition-all'
              : 'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-all'
          }
        />
      </button>
    </label>
  )
}

export function NotificationPrefsTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  const update = (patch: Partial<NotificationPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Уведомления</CardTitle>
        <p className="text-sm text-muted-foreground">
          Настройки относятся только к вашему аккаунту и сохраняются в браузере. Telegram-бот учтёт
          их на этапе 4.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <PrefToggle
          label="Уведомлять о скором ТО (за 15% ресурса)"
          value={prefs.toWarning}
          onChange={(value) => update({ toWarning: value })}
        />
        <PrefToggle
          label="Уведомлять о просроченном ТО"
          value={prefs.toOverdue}
          onChange={(value) => update({ toOverdue: value })}
        />
        <PrefToggle
          label="Уведомлять о новых заявках шеринга"
          value={prefs.sharingNewRequests}
          onChange={(value) => update({ sharingNewRequests: value })}
        />
        <PrefToggle
          label="Уведомлять о принятии/отклонении заявок"
          value={prefs.sharingRequestDecision}
          onChange={(value) => update({ sharingRequestDecision: value })}
        />
      </CardContent>
    </Card>
  )
}
