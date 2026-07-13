import type { ReportFormat } from './reportDefinitions'

export function downloadReportStub(
  title: string,
  format: ReportFormat,
  from: string,
  to: string,
): void {
  const extension = format === 'excel' ? 'xlsx' : 'pdf'
  const safeTitle = title.replace(/\s+/g, '-')
  const blob = new Blob([`Отчёт за период ${from}–${to}`], {
    type: 'text/plain;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeTitle}_${from}_${to}.${extension}`
  link.click()
  URL.revokeObjectURL(url)
}
