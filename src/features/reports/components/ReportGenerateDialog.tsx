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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFields } from '@/features/fields/hooks'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { useEquipment } from '@/features/worktime/referenceHooks'
import type { ReportDefinition } from '@/features/reports/reportDefinitions'
import {
  buildReportBody,
  buildReportFilename,
  downloadReport,
  getCurrentMonthValue,
  getCurrentYearValue,
  getYearOptions,
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
  const [year, setYear] = useState(getCurrentYearValue())
  const [equipmentId, setEquipmentId] = useState<string>('all')
  const [fieldId, setFieldId] = useState<string>('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const { data: equipment = [] } = useEquipment()
  const { data: fields = [] } = useFields()
  const yearOptions = getYearOptions()

  useEffect(() => {
    if (!open) {
      const range = getDefaultMonthRange()
      setFrom(range.from)
      setTo(range.to)
      setMonth(getCurrentMonthValue())
      setYear(getCurrentYearValue())
      setEquipmentId('all')
      setFieldId('all')
      setIsGenerating(false)
    }
  }, [open])

  const handleClose = () => {
    if (isGenerating) return
    onClose()
  }

  const canSubmit =
    report?.periodMode === 'month'
      ? Boolean(month)
      : report?.periodMode === 'year'
        ? Boolean(year)
        : Boolean(from && to)

  const handleGenerate = async () => {
    if (!report || !canSubmit) {
      toast.error('Выберите период')
      return
    }

    setIsGenerating(true)
    const loadingToastId = toast.loading('Формируем отчёт...')

    try {
      const params = {
        from,
        to,
        month,
        year,
        equipmentId: equipmentId === 'all' ? undefined : equipmentId,
        fieldId: fieldId === 'all' ? undefined : fieldId,
      }
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

        <div className="space-y-4">
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
          ) : null}

          {report?.periodMode === 'year' ? (
            <div className="space-y-2">
              <Label>Год</Label>
              <Select
                value={year}
                onValueChange={(value) => setYear(value ?? getCurrentYearValue())}
                items={yearOptions.map((option) => ({ value: option, label: option }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите год" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {report?.periodMode === 'range' ? (
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
          ) : null}

          {report?.equipmentFilter ? (
            <div className="space-y-2">
              <Label>Техника</Label>
              <Select
                value={equipmentId}
                onValueChange={(value) => setEquipmentId(value ?? 'all')}
                items={[
                  { value: 'all', label: 'Все' },
                  ...equipment.map((item) => ({ value: item.id, label: item.name })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {equipment.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {report?.fieldFilter ? (
            <div className="space-y-2">
              <Label>Поле</Label>
              <Select
                value={fieldId}
                onValueChange={(value) => setFieldId(value ?? 'all')}
                items={[
                  { value: 'all', label: 'Все' },
                  ...fields.map((item) => ({ value: item.id, label: item.name })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {fields.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

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
