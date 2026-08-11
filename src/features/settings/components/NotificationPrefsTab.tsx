import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type NotificationPrefItem = {
  type: string
  label: string
  enabled: boolean
}

const PREFS_QUERY_KEY = ['notifications', 'prefs'] as const

function useNotificationPrefs() {
  return useQuery({
    queryKey: PREFS_QUERY_KEY,
    queryFn: async (): Promise<NotificationPrefItem[]> => {
      const { data } = await api.get<{ items: NotificationPrefItem[] }>(
        '/api/notifications/prefs',
      )
      return data.items
    },
  })
}

function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      const { data } = await api.patch<{ items: NotificationPrefItem[] }>(
        '/api/notifications/prefs',
        { prefs },
      )
      return data.items
    },
    onSuccess: (items) => {
      queryClient.setQueryData(PREFS_QUERY_KEY, items)
      toast.success('Настройки уведомлений сохранены')
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Не удалось сохранить настройки уведомлений')),
  })
}

function PrefToggle({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  disabled?: boolean
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
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={
          value
            ? 'relative h-6 w-11 shrink-0 rounded-full bg-success transition-colors disabled:opacity-50'
            : 'relative h-6 w-11 shrink-0 rounded-full bg-muted transition-colors disabled:opacity-50'
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
  const { data: items = [], isLoading, isError } = useNotificationPrefs()
  const update = useUpdateNotificationPrefs()

  if (isLoading) return <PageSkeleton />
  if (isError) {
    return (
      <p className="text-sm text-destructive">Не удалось загрузить настройки уведомлений.</p>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Уведомления</CardTitle>
        <p className="text-sm text-muted-foreground">
          Включайте и отключайте типы событий для вашего аккаунта. Выключенный тип не создаёт
          новые уведомления в колокольчике (уже полученные остаются в списке).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <PrefToggle
            key={item.type}
            label={item.label}
            value={item.enabled}
            disabled={update.isPending}
            onChange={(enabled) => update.mutate({ [item.type]: enabled })}
          />
        ))}
      </CardContent>
    </Card>
  )
}
