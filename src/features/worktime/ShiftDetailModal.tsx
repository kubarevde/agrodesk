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
import { useState } from 'react'
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
import { CloseShiftModal } from './CloseShiftModal'
import { LiveDuration } from './components/LiveDuration'
import { calcLiveHours, formatShiftTime } from './utils'

interface ShiftDetailModalProps {
  shift: Shift
  open: boolean
  onClose: () => void
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

export function ShiftDetailModal({ shift, open, onClose }: ShiftDetailModalProps) {
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const hasDescription = Boolean(shift.description || shift.comment)
  const hasGeo = shift.latitude != null && shift.longitude != null
  const mapsUrl = hasGeo
    ? `https://www.google.com/maps?q=${shift.latitude},${shift.longitude}`
    : ''

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle>Смена — {shift.employeeName}</DialogTitle>
              <Badge
                variant="outline"
                className={
                  shift.status === 'open'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border bg-muted text-muted-foreground'
                }
              >
                {shift.status === 'open' ? 'Открыта' : 'Закрыта'}
              </Badge>
            </div>
          </DialogHeader>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Основное</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem icon={Calendar} label="Дата" value={shift.date} />
              <DetailItem
                icon={User}
                label="Сотрудник"
                value={`${shift.employeeName} (${shift.employeeCode})`}
              />
              <DetailItem icon={MapPin} label="Объект" value={shift.location} />
              <DetailItem icon={Wrench} label="Тип работ" value={shift.workType} />
              <DetailItem icon={Truck} label="Техника" value={shift.equipment || '—'} />
              <DetailItem icon={Clock} label="Начало" value={formatShiftTime(shift.startTime)} />
              <DetailItem
                icon={Clock}
                label="Конец"
                value={shift.endTime ? formatShiftTime(shift.endTime) : 'Смена открыта'}
              />
              <DetailItem
                icon={Timer}
                label="Длительность"
                value={
                  shift.status === 'open' ? (
                    <LiveDuration shift={shift} />
                  ) : (
                    getDurationLabel(shift)
                  )
                }
              />
            </div>
          </section>

          {hasDescription ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Описание</h3>
              <p className="text-sm">
                <span className="text-muted-foreground">Что сделано: </span>
                {shift.description || '—'}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Комментарий: </span>
                {shift.comment || '—'}
              </p>
            </section>
          ) : null}

          {hasGeo ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Геолокация</h3>
              <p className="text-sm text-foreground">
                Координаты: {shift.latitude}, {shift.longitude}
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

          <DialogFooter>
            {shift.status === 'open' ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setCloseModalOpen(true)}
              >
                Закрыть смену
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={onClose}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CloseShiftModal
        shiftId={shift.id}
        startTime={shift.startTime}
        shiftDate={shift.date}
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onSuccess={onClose}
      />
    </>
  )
}
