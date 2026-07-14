import { useState } from 'react'
import type { ReportDefinition } from '@/features/reports/reportDefinitions'
import { REPORT_DEFINITIONS } from '@/features/reports/reportDefinitions'
import { ReportCard } from './ReportCard'
import { ReportGenerateDialog } from './ReportGenerateDialog'

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const openGenerateDialog = (report: ReportDefinition) => {
    setSelectedReport(report)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Отчёты</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_DEFINITIONS.map((report) => (
          <ReportCard key={report.id} report={report} onSelect={openGenerateDialog} />
        ))}
      </div>

      <ReportGenerateDialog
        report={selectedReport}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setSelectedReport(null)
        }}
      />
    </div>
  )
}
