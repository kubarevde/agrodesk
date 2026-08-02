import { Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useExportOrdersReport, useOrdersReport } from '../hooks'

function formatAmount(value: number | string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

type OrdersReportPanelProps = {
  fromDate: string
  toDate: string
  status: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}

export function OrdersReportPanel({
  fromDate,
  toDate,
  status,
  onFromChange,
  onToChange,
}: OrdersReportPanelProps) {
  const report = useOrdersReport({
    from_date: fromDate,
    to_date: toDate,
    status: status || undefined,
  })
  const exportReport = useExportOrdersReport()

  return (
    <section
      className="rounded-lg border border-border bg-surface p-3 sm:p-4"
      aria-label="Отчёт по заявкам витрины"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Заявки витрины</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Отдельный отчёт магазина — не отчёт хозяйства и не выручка КФХ.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            С
            <input
              type="date"
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              value={fromDate}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            По
            <input
              type="date"
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              value={toDate}
              onChange={(e) => onToChange(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={exportReport.isPending || !fromDate || !toDate}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            onClick={() =>
              exportReport.mutate({
                from_date: fromDate,
                to_date: toDate,
                status: status || undefined,
                filename: `marketplace_orders_${fromDate}_${toDate}.xlsx`,
              })
            }
          >
            <Download className="size-4" aria-hidden />
            Excel
          </button>
        </div>
      </div>

      {report.isLoading ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : report.data ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Заявок за период</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {report.data.orders_count}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background p-3 sm:col-span-2">
              <p className="text-xs text-muted-foreground">
                Сумма заявок (оценка по ценам объявлений)
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {formatAmount(report.data.estimated_amount_sum)}
              </p>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {report.data.status_breakdown.map((bucket) => (
              <li
                key={bucket.status}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
              >
                <span className="text-foreground">{bucket.label}</span>
                {': '}
                <span className="tabular-nums text-foreground">{bucket.orders_count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{report.data.amount_disclaimer}</p>
        </>
      ) : null}
    </section>
  )
}

function toLocalIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function defaultReportPeriod(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), 1)
  return { from: toLocalIso(from), to: toLocalIso(to) }
}
