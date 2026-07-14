import { useEffect, useState } from 'react'
import type { DashboardActiveShift } from '@/types'
import { formatDurationMinutes, parseShiftTime } from '@/features/worktime/utils'

interface ActiveShiftLiveDurationProps {
  shift: DashboardActiveShift
}

function calcElapsedMinutes(shift: DashboardActiveShift): number {
  const fromStart = Math.max(
    0,
    Math.floor((Date.now() - parseShiftTime(shift.startTime, shift.date).getTime()) / 60_000),
  )
  return Math.max(fromStart, shift.durationMinutes)
}

export function ActiveShiftLiveDuration({ shift }: ActiveShiftLiveDurationProps) {
  const [label, setLabel] = useState(() => formatDurationMinutes(calcElapsedMinutes(shift)))

  useEffect(() => {
    const update = () => setLabel(formatDurationMinutes(calcElapsedMinutes(shift)))
    update()
    const intervalId = window.setInterval(update, 10_000)
    return () => window.clearInterval(intervalId)
  }, [shift])

  return <span>{label}</span>
}
