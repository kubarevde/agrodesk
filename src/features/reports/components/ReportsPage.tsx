import { useState } from 'react'
import { OnlineOnlyNotice } from '@/components/shared/OnlineOnlyNotice'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { reportsHelp } from '@/features/help/modules'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { ReportDefinition } from '@/features/reports/reportDefinitions'
import { REPORT_DEFINITIONS } from '@/features/reports/reportDefinitions'
import { ReportCard } from './ReportCard'
import { ReportGenerateDialog } from './ReportGenerateDialog'

export function ReportsPage() {
  const isOnline = useOnlineStatus()
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const openGenerateDialog = (report: ReportDefinition) => {
    if (!isOnline) return
    setSelectedReport(report)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Отчёты</h1>

      {!isOnline ? (
        <OnlineOnlyNotice
          hideWhenOnline={false}
          title="Отчёты доступны только онлайн"
          description="Excel-выгрузки строятся на сервере из актуальной базы. Без сети сформировать отчёт нельзя. Смены можно вести офлайн — после синхронизации они попадут в отчёты."
        />
      ) : null}

      <div
        className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ${!isOnline ? 'pointer-events-none opacity-50' : ''}`}
      >
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

      <SectionHelp title="Справка: отчёты" items={reportsHelp} />
    </div>
  )
}
