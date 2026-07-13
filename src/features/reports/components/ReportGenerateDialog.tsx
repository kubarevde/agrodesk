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
import { Label } from '@/components/ui/label'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import type { ReportDefinition, ReportFormat } from '@/features/reports/reportDefinitions'
import { downloadReportStub } from '@/features/reports/utils'

interface ReportGenerateDialogProps {
  report: ReportDefinition | null
  format: ReportFormat | null
  open: boolean
  onClose: () => void
}

export function ReportGenerateDialog({
  report,
  format,
  open,
  onClose,
}: ReportGenerateDialogProps) {
  const defaultRange = getDefaultMonthRange()
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!open) {
      const range = getDefaultMonthRange()
      setFrom(range.from)
      setTo(range.to)
      setIsGenerating(false)
    }
  }, [open])

  const handleClose = () => {
    if (isGenerating) return
    onClose()
  }

  const handleGenerate = () => {
    if (!report || !format || !from || !to) {
      toast.error('Выберите период')
      return
    }

    setIsGenerating(true)
    const loadingToastId = toast.loading('Отчёт формируется...')

    window.setTimeout(() => {
      setIsGenerating(false)
      toast.dismiss(loadingToastId)
      toast.success('Готово!', {
        action: {
          label: 'Скачать',
          onClick: () => downloadReportStub(report.title, format, from, to),
        },
      })
      downloadReportStub(report.title, format, from, to)
      handleClose()
    }, 1500)
  }

  const formatLabel = format === 'excel' ? 'Excel' : 'PDF'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {report ? `${report.title} — ${formatLabel}` : 'Сформировать отчёт'}
          </DialogTitle>
        </DialogHeader>

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

        <DialogFooter className="sm:justify-stretch">
          <Button
            type="button"
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            disabled={isGenerating || !from || !to}
            onClick={handleGenerate}
          >
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : null}
            Сформировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
