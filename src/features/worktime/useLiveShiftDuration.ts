import { useEffect, useState } from 'react'
import { formatDurationMinutes, parseShiftTime } from './utils'

export function useLiveShiftDuration(startTime: string, date: string | undefined, active: boolean) {
  const [durationLabel, setDurationLabel] = useState('0 ч 0 мин')

  useEffect(() => {
    if (!active) return

    const update = () => {
      const elapsedMs = Date.now() - parseShiftTime(startTime, date).getTime()
      const totalMinutes = Math.max(0, Math.floor(elapsedMs / 60000))
      setDurationLabel(formatDurationMinutes(totalMinutes))
    }

    update()
    const intervalId = window.setInterval(update, 1000)
    return () => window.clearInterval(intervalId)
  }, [active, date, startTime])

  return durationLabel
}
