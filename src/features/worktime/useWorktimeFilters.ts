import { useMemo, useState } from 'react'
import type { ShiftFilters } from '@/types'
import { getDefaultMonthRange } from './utils'

const defaultRange = getDefaultMonthRange()

export function useWorktimeFilters() {
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [employeeId, setEmployeeId] = useState<string | undefined>()
  const [status, setStatus] = useState<ShiftFilters['status']>('all')

  const filters = useMemo<ShiftFilters>(
    () => ({
      from,
      to,
      employeeId,
      status,
    }),
    [from, to, employeeId, status],
  )

  const hasActiveFilters =
    from !== defaultRange.from ||
    to !== defaultRange.to ||
    Boolean(employeeId) ||
    status !== 'all'

  const resetFilters = () => {
    setFrom(defaultRange.from)
    setTo(defaultRange.to)
    setEmployeeId(undefined)
    setStatus('all')
  }

  return {
    from,
    to,
    employeeId,
    status,
    filters,
    hasActiveFilters,
    setFrom,
    setTo,
    setEmployeeId,
    setStatus,
    resetFilters,
  }
}
