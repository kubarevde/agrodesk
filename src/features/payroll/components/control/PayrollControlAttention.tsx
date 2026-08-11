import { AlertTriangle, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/features/payroll-payouts/format'
import {
  attentionExplanation,
  attentionTitle,
  groupAmount,
  isAttentionKind,
  sanitizeUserText,
  ATTENTION_KIND_META,
} from '../../controlLabels'
import type {
  PayrollControlAttentionGroup,
  PayrollControlAttentionItem,
} from '../../controlTypes'

type Props = {
  groups: PayrollControlAttentionGroup[]
  onOpenRun: (runId: string) => void
  onOpenPayouts: () => void
  onOpenExpenses: () => void
}

function itemPrimary(item: PayrollControlAttentionItem, kind: string): string {
  if (kind === 'orphan_salary_expense') {
    return sanitizeUserText(item.description, 'Расход на зарплату без связи с начислением')
  }
  if (item.employeeName) return item.employeeName
  if (item.periodLabel) return item.periodLabel
  return sanitizeUserText(item.detail, 'Запись')
}

function itemSecondary(item: PayrollControlAttentionItem, kind: string): string | null {
  if (kind === 'orphan_salary_expense') {
    const parts = [
      item.date ? `Дата: ${item.date}` : null,
      item.authorName && item.authorName !== '—' ? `Добавил: ${item.authorName}` : null,
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : null
  }
  if (item.periodLabel && item.employeeName) return item.periodLabel
  return null
}

function itemAmount(item: PayrollControlAttentionItem): string | null {
  const value =
    item.remainder ?? item.overpay ?? item.amount ?? item.totalAmount ?? item.accrued
  return value != null ? formatMoney(value) : null
}

function GroupAction({
  group,
  onOpenRun,
  onOpenPayouts,
  onOpenExpenses,
}: {
  group: PayrollControlAttentionGroup
  onOpenRun: (runId: string) => void
  onOpenPayouts: () => void
  onOpenExpenses: () => void
}) {
  const meta = isAttentionKind(group.kind) ? ATTENTION_KIND_META[group.kind] : null
  const label = meta?.actionLabel ?? 'Открыть'
  const firstRun = group.items.find((i) => i.runId)?.runId
  const action = meta?.action ?? (firstRun ? 'accruals' : 'payouts')

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 w-full shrink-0 sm:min-h-8 sm:w-auto"
      onClick={() => {
        if (action === 'expenses') onOpenExpenses()
        else if (action === 'payouts') onOpenPayouts()
        else if (firstRun) onOpenRun(firstRun)
        else onOpenPayouts()
      }}
    >
      {group.kind === 'orphan_salary_expense' ? 'Открыть расходы' : label}
    </Button>
  )
}

export function PayrollControlAttention({
  groups,
  onOpenRun,
  onOpenPayouts,
  onOpenExpenses,
}: Props) {
  const safeGroups = Array.isArray(groups) ? groups : []

  if (safeGroups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center">
        <p className="text-sm font-medium">Внимание не требуется</p>
        <p className="mt-1 text-sm text-muted-foreground">
          В выбранном периоде нет начислений, требующих внимания
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-destructive" />
        <h3 className="text-sm font-semibold">Требует внимания</h3>
      </div>
      <ul className="space-y-3">
        {safeGroups.map((group) => {
          const title = attentionTitle(group.kind, group.title)
          const explanation = attentionExplanation(group.kind, group.explanation)
          const amount = groupAmount(group)
          return (
            <li
              key={group.kind}
              className="space-y-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{title}</p>
                    <Badge variant={group.critical ? 'destructive' : 'secondary'}>
                      {group.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{explanation}</p>
                  {amount > 0 ? (
                    <p className="text-sm tabular-nums text-foreground">{formatMoney(amount)}</p>
                  ) : null}
                </div>
                <GroupAction
                  group={group}
                  onOpenRun={onOpenRun}
                  onOpenPayouts={onOpenPayouts}
                  onOpenExpenses={onOpenExpenses}
                />
              </div>
              <details className="group/details">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground">
                  <ChevronDown className="size-3.5 transition-transform group-open/details:rotate-180" />
                  Показать записи
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {(Array.isArray(group.items) ? group.items : []).slice(0, 8).map((item, idx) => {
                    const amountLabel = itemAmount(item)
                    const secondary = itemSecondary(item, group.kind)
                    return (
                      <li
                        key={`${group.kind}-${item.runId ?? item.payoutId ?? item.expenseId ?? idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate">{itemPrimary(item, group.kind)}</p>
                          {secondary ? (
                            <p className="truncate text-xs text-muted-foreground">{secondary}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {amountLabel ? (
                            <span className="tabular-nums">{amountLabel}</span>
                          ) : null}
                          {item.runId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="min-h-9 px-2 sm:h-7 sm:min-h-0"
                              onClick={() => {
                                const runId = item.runId
                                if (runId) onOpenRun(runId)
                              }}
                            >
                              Открыть
                            </Button>
                          ) : group.kind === 'orphan_salary_expense' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="min-h-9 px-2 sm:h-7 sm:min-h-0"
                              onClick={onOpenExpenses}
                            >
                              Открыть расход
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </details>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
