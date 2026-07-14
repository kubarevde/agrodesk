import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import type { ReportDefinition } from '@/features/reports/reportDefinitions'
import {
  buildReportBody,
  buildReportFilename,
  downloadReport,
  getCurrentMonthValue,
} from '@/features/reports/utils'

interface ReportGenerateDialogProps {
  report: ReportDefinition | null
  open: boolean
  onClose: () => void
}

export function ReportGenerateDialog({ report, open, onClose }: ReportGenerateDialogProps) {
  const defaultRange = getDefaultMonthRange()
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [month, setMonth] = useState(getCurrentMonthValue())
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!open) {
      const range = getDefaultMonthRange()
      setFrom(range.from)
      setTo(range.to)
      setMonth(getCurrentMonthValue())
      setIsGenerating(false)
    }
  }, [open])

  const handleClose = () => {
    if (isGenerating) return
    onClose()
  }

  const canSubmit =
    report?.periodMode === 'month' ? Boolean(month) : Boolean(from && to)

  const handleGenerate = async () => {
    if (!report || !canSubmit) {
      toast.error('Выберите период')
      return
    }

    setIsGenerating(true)
    const loadingToastId = toast.loading('Формируем отчёт...')

    try {
      const params = { from, to, month }
      await downloadReport(
        report.endpoint,
        buildReportBody(report, params),
        buildReportFilename(report, params),
      )
      toast.success('📥 Файл скачан')
      onClose()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось сформировать отчёт'
      toast.error(`Ошибка: ${message}`)
    } finally {
      toast.dismiss(loadingToastId)
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {report ? `${report.title} — Excel` : 'Сформировать отчёт'}
          </DialogTitle>
        </DialogHeader>

        {report?.periodMode === 'month' ? (
          <div className="space-y-2">
            <Label htmlFor="report-month">Месяц</Label>
            <Input
              id="report-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Период</Label>
            <DateRangePicker
              from={from}
              to={to}
              onChange={({ from: nextFrom, to: nextTo }) => {
                if (nextFrom) setFrom(nextFrom)
                if (nextTo) setTo(nextTo)
              }}
              className="w-full"
            />
          </div>
        )}

        <DialogFooter className="sm:justify-stretch">
          <Button
            type="button"
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            disabled={isGenerating || !canSubmit}
            onClick={() => void handleGenerate()}
          >
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : null}
            Сформировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
