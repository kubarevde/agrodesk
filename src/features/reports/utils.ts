import { format } from 'date-fns'
import { api } from '@/lib/api'
import { displayDateToIso } from '@/lib/transformers'
import type { ReportDefinition } from './reportDefinitions'

export function getCurrentMonthValue(): string {
  return format(new Date(), 'yyyy-MM')
}

export function getCurrentYearValue(): string {
  return format(new Date(), 'yyyy')
}

export function getYearOptions(): string[] {
  const current = new Date().getFullYear()
  return [String(current), String(current - 1), String(current - 2)]
}

export async function downloadReport(
  url: string,
  body: object,
  filename: string,
): Promise<void> {
  const response = await api.post<Blob>(url, body, { responseType: 'blob' })
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(response.data)
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export function buildReportBody(
  report: ReportDefinition,
  params: {
    from: string
    to: string
    month: string
    year: string
    equipmentId?: string
    fieldId?: string
  },
): object {
  if (report.periodMode === 'month') {
    return { month: params.month }
  }

  if (report.periodMode === 'year') {
    return { year: Number(params.year) }
  }

  const body: Record<string, unknown> = {
    from_date: displayDateToIso(params.from),
    to_date: displayDateToIso(params.to),
  }

  if (report.equipmentFilter) {
    body.equipment_id = params.equipmentId || null
  }

  if (report.fieldFilter) {
    body.field_id = params.fieldId || null
  }

  return body
}

export function buildReportFilename(
  report: ReportDefinition,
  params: { from: string; to: string; month: string; year?: string },
): string {
  return report.filename({
    from: displayDateToIso(params.from),
    to: displayDateToIso(params.to),
    month: params.month,
    year: params.year ?? getCurrentYearValue(),
  })
}
