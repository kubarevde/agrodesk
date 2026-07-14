import { format } from 'date-fns'
import { api } from '@/lib/api'
import { displayDateToIso } from '@/lib/transformers'
import type { ReportDefinition } from './reportDefinitions'

export function getCurrentMonthValue(): string {
  return format(new Date(), 'yyyy-MM')
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
  params: { from: string; to: string; month: string },
): object {
  if (report.periodMode === 'month') {
    return { month: params.month }
  }

  return {
    from_date: displayDateToIso(params.from),
    to_date: displayDateToIso(params.to),
  }
}

export function buildReportFilename(
  report: ReportDefinition,
  params: { from: string; to: string; month: string },
): string {
  return report.filename({
    from: displayDateToIso(params.from),
    to: displayDateToIso(params.to),
    month: params.month,
  })
}
