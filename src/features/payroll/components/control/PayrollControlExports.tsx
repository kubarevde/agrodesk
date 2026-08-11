import { ChevronDown, Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SalaryCalcTab } from '@/features/employees/components/SalaryCalcTab'
import { downloadPayrollControlExport } from '../../controlHooks'
import type { PayrollControlExportKind } from '../../controlTypes'

type Props = {
  periodStart: string
  periodEnd: string
}

const EXPORTS: { kind: PayrollControlExportKind; label: string }[] = [
  { kind: 'accruals', label: 'Реестр начислений' },
  { kind: 'payouts', label: 'Ведомость выдачи' },
  { kind: 'advances', label: 'Реестр авансов' },
]

export function PayrollControlExports({ periodStart, periodEnd }: Props) {
  const [busy, setBusy] = useState<PayrollControlExportKind | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const onExport = async (kind: PayrollControlExportKind) => {
    setBusy(kind)
    try {
      await downloadPayrollControlExport(kind, periodStart, periodEnd)
    } catch {
      // toast already shown in helper
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Документы и выгрузки</h3>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          {EXPORTS.map(({ kind, label }) => (
            <Button
              key={kind}
              type="button"
              variant="outline"
              className="min-h-11 w-full justify-start sm:min-h-9 sm:w-auto"
              disabled={busy !== null}
              onClick={() => {
                if (!periodStart || !periodEnd) {
                  toast.error('Выберите период')
                  return
                }
                void onExport(kind)
              }}
            >
              <Download className="size-4 shrink-0" />
              {busy === kind ? 'Скачивание…' : label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
          onClick={() => setPreviewOpen((v) => !v)}
        >
          <div>
            <p className="text-sm font-semibold">Предварительный расчёт по сменам</p>
            <p className="text-xs text-muted-foreground">
              Ориентир по закрытым сменам × ставка. Не заменяет подтверждённую ведомость.
            </p>
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${previewOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {previewOpen ? (
          <div className="border-t border-border p-3">
            <SalaryCalcTab />
          </div>
        ) : null}
      </div>
    </div>
  )
}
