import { Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { StaleCacheNotice } from '@/components/shared/StaleCacheNotice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Shift } from '@/types'
import { ManagerActiveWorkersList } from './ManagerActiveWorkersList'

type Props = {
  shifts: Shift[]
  isLoading: boolean
  isOnline: boolean
  canOpenOthers: boolean
  canOpenOwn: boolean
  canCloseOthers: boolean
  currentUserId?: string
  currentEmployeeCode?: string
  onOpenOther: () => void
  onOpenOwn: () => void
  onCloseShift: (shift: Shift) => void
}

export function ManagerTeamBoardCard({
  shifts,
  isLoading,
  isOnline,
  canOpenOthers,
  canOpenOwn,
  canCloseOthers,
  currentUserId,
  currentEmployeeCode,
  onOpenOther,
  onOpenOwn,
  onCloseShift,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Кто сейчас работает</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <StaleCacheNotice detail="Офлайн: показан кэш открытых смен — актуальный дашборд только онлайн." />
        {isLoading ? (
          <SkeletonTable rows={3} columns={3} />
        ) : shifts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Сейчас никто не работает"
            description={
              !isOnline
                ? 'Офлайн: список из кэша пуст. Откройте приложение онлайн, чтобы обновить.'
                : canOpenOthers
                  ? 'Откройте смену за сотрудника'
                  : 'Откройте свою смену, когда начнёте работу'
            }
            action={
              canOpenOthers
                ? { label: 'Открыть смену за сотрудника', onClick: onOpenOther }
                : canOpenOwn
                  ? { label: 'Открыть свою смену', onClick: onOpenOwn }
                  : undefined
            }
          />
        ) : (
          <ManagerActiveWorkersList
            shifts={shifts}
            canCloseOthers={canCloseOthers}
            currentUserId={currentUserId}
            currentEmployeeCode={currentEmployeeCode}
            onCloseShift={onCloseShift}
          />
        )}
      </CardContent>
    </Card>
  )
}
