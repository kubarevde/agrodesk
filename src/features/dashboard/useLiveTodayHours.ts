import { useEffect, useRef, useState } from 'react'
import type { DashboardActiveShift } from '@/types'
import { calcLiveHours } from '@/features/worktime/utils'

function toOpenShift(shift: DashboardActiveShift) {
  return {
    ...shift,
    status: 'open' as const,
    employeeCode: '',
    telegramId: '',
    endTime: null,
    workType: '',
    equipment: '',
    description: '',
    comment: '',
    durationRaw: null,
    durationRounded: null,
    latitude: null,
    longitude: null,
  }
}

function sumOpenHours(activeShifts: DashboardActiveShift[]): number {
  return activeShifts.reduce((sum, shift) => sum + calcLiveHours(toOpenShift(shift)), 0)
}

export function useLiveTodayHours(
  todayHours: number,
  activeShifts: DashboardActiveShift[],
): number {
  const baselineRef = useRef<number | null>(null)
  const [displayHours, setDisplayHours] = useState(todayHours)

  useEffect(() => {
    baselineRef.current = null

    const update = () => {
      const currentOpen = sumOpenHours(activeShifts)
      if (baselineRef.current === null) {
        baselineRef.current = currentOpen
      }
      setDisplayHours(todayHours + (currentOpen - baselineRef.current))
    }

    update()
    const intervalId = window.setInterval(update, 30_000)
    return () => window.clearInterval(intervalId)
  }, [todayHours, activeShifts])

  return displayHours
}
