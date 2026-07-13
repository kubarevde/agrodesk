import { useEffect, useState } from 'react'
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

interface ActiveShiftLiveDurationProps {
  shift: DashboardActiveShift
}

export function ActiveShiftLiveDuration({ shift }: ActiveShiftLiveDurationProps) {
  const [hours, setHours] = useState(() => calcLiveHours(toOpenShift(shift)))

  useEffect(() => {
    const update = () => setHours(calcLiveHours(toOpenShift(shift)))
    update()
    const intervalId = window.setInterval(update, 10_000)
    return () => window.clearInterval(intervalId)
  }, [shift])

  return <span>{hours} ч</span>
}
