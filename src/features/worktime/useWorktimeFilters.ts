import { useEffect, useMemo, useState } from 'react'
import type { ShiftFilters } from '@/types'
import { getDefaultMonthRange } from './utils'

const defaultRange = getDefaultMonthRange()

type UseWorktimeFiltersOptions = {
  /** From `/worktime?field_id=` — optional filter, does not change default page behaviour. */
  fieldId?: string
}

export function useWorktimeFilters(options?: UseWorktimeFiltersOptions) {
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [employeeId, setEmployeeId] = useState<string | undefined>()
  const [status, setStatus] = useState<ShiftFilters['status']>('all')
  const [fieldId, setFieldId] = useState<string | undefined>(options?.fieldId)

  useEffect(() => {
    setFieldId(options?.fieldId)
  }, [options?.fieldId])

  const filters = useMemo<ShiftFilters>(
    () => ({
      from,
      to,
      employeeId,
      fieldId,
      status,
    }),
    [from, to, employeeId, fieldId, status],
  )

  const hasActiveFilters =
    from !== defaultRange.from ||
    to !== defaultRange.to ||
    Boolean(employeeId) ||
    Boolean(fieldId) ||
    status !== 'all'

  const resetFilters = () => {
    setFrom(defaultRange.from)
    setTo(defaultRange.to)
    setEmployeeId(undefined)
    setFieldId(undefined)
    setStatus('all')
  }

  return {
    from,
    to,
    employeeId,
    fieldId,
    status,
    filters,
    hasActiveFilters,
    setFrom,
    setTo,
    setEmployeeId,
    setFieldId,
    setStatus,
    resetFilters,
  }
}
