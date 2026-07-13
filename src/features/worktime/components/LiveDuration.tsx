import { useEffect, useState } from 'react'
import type { Shift } from '@/types'
import { calcLiveHours } from '@/features/worktime/utils'

interface LiveDurationProps {
  shift: Shift
}

export function LiveDuration({ shift }: LiveDurationProps) {
  const [hours, setHours] = useState(() =>
    shift.status === 'open' ? calcLiveHours(shift) : shift.durationRounded,
  )

  useEffect(() => {
    if (shift.status !== 'open') {
      setHours(shift.durationRounded)
      return
    }

    const update = () => setHours(calcLiveHours(shift))
    update()
    const intervalId = window.setInterval(update, 60_000)
    return () => window.clearInterval(intervalId)
  }, [shift])

  if (shift.status === 'closed') {
    return <span>{shift.durationRounded != null ? `${shift.durationRounded} ч` : '—'}</span>
  }

  return <span>{hours} ч</span>
}
