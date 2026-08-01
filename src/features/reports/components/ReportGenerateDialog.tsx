import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useCanViewHolding,
  useHoldingChildren,
  useHoldingContext,
} from '@/features/holding/hooks'
import { useFields } from '@/features/fields/hooks'
import { useEquipment } from '@/features/worktime/referenceHooks'
import type { ReportDefinition } from '@/features/reports/reportDefinitions'
import { HoldingReportScopeFields } from '@/features/reports/components/HoldingReportScopeFields'
import { ReportEntityFilters } from '@/features/reports/components/ReportEntityFilters'
import { ReportPeriodFields } from '@/features/reports/components/ReportPeriodFields'
import { exportReportWithScope } from '@/features/reports/exportWithScope'
import { useReportGenerateForm } from '@/features/reports/useReportGenerateForm'
import { getYearOptions } from '@/features/reports/utils'

interface ReportGenerateDialogProps {
  report: ReportDefinition | null
  open: boolean
  onClose: () => void
}

export function ReportGenerateDialog({ report, open, onClose }: ReportGenerateDialogProps) {
  const form = useReportGenerateForm(open, report?.id)
  const canViewHolding = useCanViewHolding()
  const holdingCtx = useHoldingContext()
  const showHoldingScope = canViewHolding && !holdingCtx
  const { data: holdingChildren } = useHoldingChildren(showHoldingScope && open)
  const children = holdingChildren ?? []
  const hasHoldingChildren = children.length > 0
  const { data: equipment = [] } = useEquipment()
  const { data: fields = [] } = useFields()
  const yearOptions = getYearOptions()

  const periodOk =
    report?.periodMode === 'month'
      ? Boolean(form.month)
      : report?.periodMode === 'year'
        ? Boolean(form.year)
        : Boolean(form.from && form.to)
  const scopeOk =
    !showHoldingScope ||
    !hasHoldingChildren ||
    form.scope === 'current' ||
    form.scope === 'group' ||
    Boolean(form.childOrgId)
  const canSubmit = Boolean(report) && periodOk && scopeOk

  const handleGenerate = async () => {
    if (!report || !canSubmit) {
      toast.error(
        form.scope === 'child' && !form.childOrgId ? 'Выберите КФХ' : 'Выберите период',
      )
      return
    }
    form.setIsGenerating(true)
    const loadingToastId = toast.loading('Формируем отчёт...')
    try {
      await exportReportWithScope({
        report,
        scope: form.scope,
        useHolding: showHoldingScope && hasHoldingChildren,
        childOrgId: form.childOrgId,
        children,
        from: form.from,
        to: form.to,
        month: form.month,
        year: form.year,
        equipmentId: form.equipmentId === 'all' ? undefined : form.equipmentId,
        fieldId: form.fieldId === 'all' ? undefined : form.fieldId,
      })
      toast.success('Файл скачан')
      onClose()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось сформировать отчёт'
      toast.error(`Ошибка: ${message}`)
    } finally {
      toast.dismiss(loadingToastId)
      form.setIsGenerating(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && !form.isGenerating && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {report ? `${report.title} — Excel` : 'Сформировать отчёт'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {showHoldingScope && hasHoldingChildren && report ? (
            <HoldingReportScopeFields
              reportId={report.id}
              children={children}
              scope={form.scope}
              childOrgId={form.childOrgId}
              onScopeChange={form.setScope}
              onChildOrgIdChange={form.setChildOrgId}
            />
          ) : null}
          {report ? (
            <ReportPeriodFields
              periodMode={report.periodMode}
              from={form.from}
              to={form.to}
              month={form.month}
              year={form.year}
              yearOptions={yearOptions}
              onFromToChange={(nextFrom, nextTo) => {
                form.setFrom(nextFrom)
                form.setTo(nextTo)
              }}
              onMonthChange={form.setMonth}
              onYearChange={form.setYear}
            />
          ) : null}
          {report ? (
            <ReportEntityFilters
              showEquipment={Boolean(report.equipmentFilter) && form.scope === 'current'}
              showField={Boolean(report.fieldFilter) && form.scope === 'current'}
              equipmentId={form.equipmentId}
              fieldId={form.fieldId}
              equipment={equipment}
              fields={fields}
              onEquipmentIdChange={form.setEquipmentId}
              onFieldIdChange={form.setFieldId}
            />
          ) : null}
        </div>
        <DialogFooter className="sm:justify-stretch">
          <Button
            type="button"
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            disabled={form.isGenerating || !canSubmit}
            onClick={() => void handleGenerate()}
          >
            {form.isGenerating ? <Loader2 className="size-4 animate-spin" /> : null}
            Сформировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
