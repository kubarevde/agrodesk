import {
  Calendar,
  Clock,
  MapPin,
  Timer,
  Truck,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Shift } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { CloseShiftModal } from './CloseShiftModal'
import { EditShiftModal } from './EditShiftModal'
import { LiveDuration } from './components/LiveDuration'
import { calcLiveHours, formatShiftTime } from './utils'

interface ShiftDetailModalProps {
  shift: Shift
  open: boolean
  onClose: () => void
  onDelete?: (shift: Shift) => void
}

interface DetailItemProps {
  icon: LucideIcon
  label: string
  value: ReactNode
}

function DetailItem({ icon: Icon, label, value }: DetailItemProps) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

function getDurationLabel(shift: Shift): string {
  if (shift.status === 'closed' && shift.durationRounded != null && shift.durationRaw != null) {
    return `${shift.durationRounded} ч (${shift.durationRaw} мин)`
  }
  if (shift.status === 'open') {
    const hours = calcLiveHours(shift)
    const minutes = Math.round(hours * 60)
    return `${hours} ч (${minutes} мин)`
  }
  return '—'
}

export function ShiftDetailModal({ shift, open, onClose, onDelete }: ShiftDetailModalProps) {
  const { data: user } = useCurrentUser()
  const [liveShift, setLiveShift] = useState(shift)
  useEffect(() => {
    setLiveShift(shift)
  }, [shift])

  const isManager = user?.role === 'admin' || user?.role === 'manager'
  const canClose =
    liveShift.status === 'open' &&
    (isManager || (Boolean(liveShift.employeeId) && liveShift.employeeId === user?.id))
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const hasDescription = Boolean(liveShift.description || liveShift.comment)
  const hasGeo = liveShift.latitude != null && liveShift.longitude != null
  const mapsUrl = hasGeo
    ? `https://www.google.com/maps?q=${liveShift.latitude},${liveShift.longitude}`
    : ''

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle>Смена — {liveShift.employeeName}</DialogTitle>
              <Badge
                variant="outline"
                className={
                  liveShift.status === 'open'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border bg-muted text-muted-foreground'
                }
              >
                {liveShift.status === 'open' ? 'Открыта' : 'Закрыта'}
              </Badge>
            </div>
          </DialogHeader>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Основное</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem icon={Calendar} label="Дата" value={liveShift.date} />
              <DetailItem
                icon={User}
                label="Сотрудник"
                value={`${liveShift.employeeName} (${liveShift.employeeCode})`}
              />
              <DetailItem icon={MapPin} label="Объект" value={liveShift.location} />
              {liveShift.fieldName ? (
                <DetailItem icon={MapPin} label="Поле" value={liveShift.fieldName} />
              ) : null}
              <DetailItem icon={Wrench} label="Тип работ" value={liveShift.workType} />
              <DetailItem
                icon={Truck}
                label="Техника"
                value={
                  <span className="space-y-1">
                    <span className="block">{liveShift.equipment || '—'}</span>
                    {liveShift.equipmentMeterLabel ? (
                      <span className="block text-xs text-muted-foreground">
                        Тип счётчика: {liveShift.equipmentMeterLabel}
                      </span>
                    ) : null}
                    {liveShift.equipmentMeterType === 'shift_hours' &&
                    liveShift.status === 'closed' &&
                    liveShift.durationRounded != null ? (
                      <span className="block text-xs text-muted-foreground">
                        Эта смена добавила {liveShift.durationRounded} ч к счётчику
                      </span>
                    ) : null}
                  </span>
                }
              />
              {liveShift.implementName ? (
                <DetailItem icon={Wrench} label="Приспособление" value={liveShift.implementName} />
              ) : null}
              <DetailItem icon={Clock} label="Начало" value={formatShiftTime(liveShift.startTime)} />
              <DetailItem
                icon={Clock}
                label="Конец"
                value={
                  liveShift.endTime
                    ? `${formatShiftTime(liveShift.endTime)}${
                        liveShift.endDate && liveShift.endDate !== liveShift.date
                          ? ` · ${liveShift.endDate}`
                          : ''
                      }`
                    : 'Смена открыта'
                }
              />
              <DetailItem
                icon={Timer}
                label="Длительность"
                value={
                  liveShift.status === 'open' ? (
                    <LiveDuration shift={liveShift} />
                  ) : (
                    getDurationLabel(liveShift)
                  )
                }
              />
            </div>
            {liveShift.timeAdjusted ? (
              <p className="text-xs text-muted-foreground">
                Время смены скорректировано вручную. Подробности — в истории изменений.
              </p>
            ) : null}
          </section>

          {hasDescription ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Описание</h3>
              <p className="text-sm">
                <span className="text-muted-foreground">Что сделано: </span>
                {liveShift.description || '—'}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Комментарий: </span>
                {liveShift.comment || '—'}
              </p>
            </section>
          ) : null}

          {hasGeo ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Геолокация</h3>
              <p className="text-sm text-foreground">
                Координаты: {liveShift.latitude}, {liveShift.longitude}
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                Открыть на карте
              </a>
            </section>
          ) : null}

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {onDelete ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => onDelete(liveShift)}
              >
                Удалить смену
              </Button>
            ) : null}
            {canClose ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setCloseModalOpen(true)}
              >
                Закрыть смену
              </Button>
            ) : null}
            {isManager ? (
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(true)}>
                Редактировать
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={onClose}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CloseShiftModal
        shiftId={liveShift.id}
        employeeId={liveShift.employeeId}
        startTime={liveShift.startTime}
        shiftDate={liveShift.date}
        equipmentName={liveShift.equipment || undefined}
        equipmentMeterType={liveShift.equipmentMeterType}
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onSuccess={onClose}
      />

      {isManager ? (
        <EditShiftModal
          shift={liveShift}
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onUpdated={setLiveShift}
        />
      ) : null}
    </>
  )
}
