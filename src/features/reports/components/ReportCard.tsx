import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReportDefinition } from '@/features/reports/reportDefinitions'

interface ReportCardProps {
  report: ReportDefinition
  onSelect: (report: ReportDefinition) => void
}

export function ReportCard({ report, onSelect }: ReportCardProps) {
  const Icon = report.icon

  return (
    <button
      type="button"
      onClick={() => onSelect(report)}
      className="h-full text-left transition-colors"
    >
      <Card className="flex h-full flex-col transition-colors hover:border-primary/40 hover:bg-primary/5">
        <CardHeader className="space-y-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <CardTitle className="text-base font-semibold text-foreground">{report.title}</CardTitle>
        </CardHeader>
        <CardContent className="mt-auto">
          <p className="text-sm text-muted-foreground">{report.description}</p>
        </CardContent>
      </Card>
    </button>
  )
}
