import { useEffect, useState } from 'react'
import { parseShiftTime } from './utils'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatElapsed(startTime: string, date: string | undefined): string {
  const elapsedMs = Math.max(0, Date.now() - parseShiftTime(startTime, date).getTime())
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function useLiveShiftTimer(
  startTime: string,
  date: string | undefined,
  active: boolean,
): string {
  const [label, setLabel] = useState('00:00:00')

  useEffect(() => {
    if (!active) return

    const update = () => setLabel(formatElapsed(startTime, date))
    update()
    const intervalId = window.setInterval(update, 1000)
    return () => window.clearInterval(intervalId)
  }, [active, date, startTime])

  return label
}
