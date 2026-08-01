import { useEffect, useState } from 'react'
import type { ReportScopeKind } from '@/features/reports/components/HoldingReportScopeFields'
import {
  getCurrentMonthValue,
  getCurrentYearValue,
} from '@/features/reports/utils'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { getHoldingSupport } from '@/features/reports/holdingSupport'

export function useReportGenerateForm(open: boolean, reportId: string | undefined) {
  const defaultRange = getDefaultMonthRange()
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [month, setMonth] = useState(getCurrentMonthValue())
  const [year, setYear] = useState(getCurrentYearValue())
  const [equipmentId, setEquipmentId] = useState('all')
  const [fieldId, setFieldId] = useState('all')
  const [scope, setScope] = useState<ReportScopeKind>('current')
  const [childOrgId, setChildOrgId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!open) {
      const range = getDefaultMonthRange()
      setFrom(range.from)
      setTo(range.to)
      setMonth(getCurrentMonthValue())
      setYear(getCurrentYearValue())
      setEquipmentId('all')
      setFieldId('all')
      setScope('current')
      setChildOrgId('')
      setIsGenerating(false)
    }
  }, [open])

  useEffect(() => {
    if (!reportId || scope !== 'group') return
    if (!getHoldingSupport(reportId)?.modes.includes('group')) setScope('current')
  }, [reportId, scope])

  return {
    from,
    to,
    month,
    year,
    equipmentId,
    fieldId,
    scope,
    childOrgId,
    isGenerating,
    setFrom,
    setTo,
    setMonth,
    setYear,
    setEquipmentId,
    setFieldId,
    setScope,
    setChildOrgId,
    setIsGenerating,
  }
}
