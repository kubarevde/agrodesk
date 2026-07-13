import { FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReportDefinition, ReportFormat } from '@/features/reports/reportDefinitions'

interface ReportCardProps {
  report: ReportDefinition
  onExport: (report: ReportDefinition, format: ReportFormat) => void
}

const FORMAT_LABELS: Record<ReportFormat, string> = {
  excel: 'Excel',
  pdf: 'PDF',
}

export function ReportCard({ report, onExport }: ReportCardProps) {
  const Icon = report.icon

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <CardTitle className="text-base font-semibold text-foreground">{report.title}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        <p className="text-sm text-muted-foreground">{report.description}</p>
        <div className="flex flex-wrap gap-2">
          {report.formats.map((format) => (
            <Button
              key={format}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExport(report, format)}
            >
              {format === 'excel' ? (
                <FileSpreadsheet className="size-4" />
              ) : (
                <FileText className="size-4" />
              )}
              {FORMAT_LABELS[format]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
