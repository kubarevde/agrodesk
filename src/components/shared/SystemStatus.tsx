import type { ReactNode } from 'react'
import { liveQuery } from 'dexie'
import {
  CheckCircle2,
  CloudOff,
  MapPinned,
  Radio,
  Share2,
  Users,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { useDashboardStats } from '@/features/dashboard/hooks'

const HEALTH_INTERVAL_MS = 30_000

export function SystemStatus() {
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const { data: stats } = useDashboardStats()

  useEffect(() => {
    let cancelled = false

    const checkHealth = async () => {
      try {
        await api.get('/health', { timeout: 5000 })
        if (!cancelled) setApiOk(true)
      } catch {
        if (!cancelled) setApiOk(false)
      }
    }

    void checkHealth()
    const timer = window.setInterval(() => void checkHealth(), HEALTH_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const subscription = liveQuery(() => db.syncQueue.count()).subscribe({
      next: (count) => setQueueCount(count),
      error: () => setQueueCount(0),
    })
    return () => subscription.unsubscribe()
  }, [])

  const warningCount = stats?.equipmentWarningCount ?? stats?.equipmentWarnings?.length ?? 0
  const agroToday = stats?.agroPlanToday?.length ?? 0
  const sharingRequests = stats?.sharingNewRequests ?? 0
  const activeShifts = stats?.activeShifts?.length ?? 0

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatusCard
        icon={Radio}
        title="Система"
        value={apiOk === null ? '…' : apiOk ? 'API онлайн' : 'API недоступен'}
        tone={apiOk === false ? 'danger' : apiOk ? 'ok' : 'muted'}
        hint={
          queueCount > 0
            ? `Офлайн-буфер: ${queueCount}`
            : 'Офлайн-буфер пуст'
        }
      />
      <StatusCard
        icon={Wrench}
        title="Техника"
        value={`${warningCount} требуют внимания`}
        tone={warningCount > 0 ? 'warn' : 'ok'}
        hint="Предупреждения по ТО"
      />
      <StatusCard
        icon={MapPinned}
        title="Поля / планы"
        value={`${agroToday} на сегодня`}
        tone={agroToday > 0 ? 'ok' : 'muted'}
        hint="Агрокалендарь"
      />
      <StatusCard
        icon={Share2}
        title="Шеринг"
        value={`${sharingRequests} новых заявок`}
        tone={sharingRequests > 0 ? 'warn' : 'muted'}
        hint={
          <>
            <Users className="mr-1 inline size-3.5" aria-hidden />
            Открытых смен: {activeShifts}
          </>
        }
      />
    </div>
  )
}

type StatusCardProps = {
  icon: typeof CheckCircle2
  title: string
  value: string
  hint: ReactNode
  tone: 'ok' | 'warn' | 'danger' | 'muted'
}

function StatusCard({ icon: Icon, title, value, hint, tone }: StatusCardProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {title}
      </div>
      <p
        className={cn(
          'text-sm font-semibold',
          tone === 'ok' && 'text-success',
          tone === 'warn' && 'text-amber-700',
          tone === 'danger' && 'text-destructive',
          tone === 'muted' && 'text-foreground',
        )}
      >
        {tone === 'ok' ? <CheckCircle2 className="mr-1 inline size-3.5" aria-hidden /> : null}
        {tone === 'danger' ? <CloudOff className="mr-1 inline size-3.5" aria-hidden /> : null}
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
