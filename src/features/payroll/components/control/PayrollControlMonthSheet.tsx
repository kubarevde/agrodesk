import { format, isValid, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { formatMoney } from '@/features/payroll-payouts/format'
import {
  ATTENTION_KIND_META,
  attentionExplanation,
  attentionTitle,
  isAttentionKind,
} from '../../controlLabels'
import type { PayrollControlDynamicsIssue, PayrollControlDynamicsRow } from '../../controlTypes'

type Props = {
  row: PayrollControlDynamicsRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenAccruals: (monthStart: string, monthEnd: string) => void
  onOpenPayouts: (monthStart: string, monthEnd: string) => void
  onOpenExpenses: (monthStart: string, monthEnd: string) => void
}

function monthTitle(month: string): string {
  const d = parseISO(`${month}-01`)
  if (!isValid(d)) return month
  return format(d, 'LLLL yyyy', { locale: ru })
}

function issueAction(kind: string): 'accruals' | 'payouts' | 'expenses' {
  if (isAttentionKind(kind)) return ATTENTION_KIND_META[kind].action
  return 'accruals'
}

function IssueCard({
  issue,
  monthStart,
  monthEnd,
  onOpenAccruals,
  onOpenPayouts,
  onOpenExpenses,
}: {
  issue: PayrollControlDynamicsIssue
  monthStart: string
  monthEnd: string
  onOpenAccruals: (monthStart: string, monthEnd: string) => void
  onOpenPayouts: (monthStart: string, monthEnd: string) => void
  onOpenExpenses: (monthStart: string, monthEnd: string) => void
}) {
  const title = attentionTitle(issue.kind, issue.title)
  const explanation = attentionExplanation(issue.kind, issue.explanation)
  const action = issueAction(issue.kind)
  const actionLabel = isAttentionKind(issue.kind)
    ? ATTENTION_KIND_META[issue.kind].actionLabel
    : 'Открыть'

  return (
    <li className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{explanation}</p>
        <p className="text-sm text-foreground">
          Записей: {issue.count}
          {issue.amount > 0 ? ` · ${formatMoney(issue.amount)}` : ''}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full sm:min-h-8 sm:w-auto"
        onClick={() => {
          if (action === 'expenses') onOpenExpenses(monthStart, monthEnd)
          else if (action === 'payouts') onOpenPayouts(monthStart, monthEnd)
          else onOpenAccruals(monthStart, monthEnd)
        }}
      >
        {actionLabel}
      </Button>
    </li>
  )
}

export function PayrollControlMonthSheet({
  row,
  open,
  onOpenChange,
  onOpenAccruals,
  onOpenPayouts,
  onOpenExpenses,
}: Props) {
  const isMobile = useIsMobile(639)
  const issues = row && Array.isArray(row.issues) ? row.issues : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        showCloseButton
        className={
          isMobile
            ? 'flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0'
            : 'flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md'
        }
      >
        {isMobile ? (
          <div
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
            aria-hidden
          />
        ) : null}

        <SheetHeader className="shrink-0 space-y-2 border-b border-border px-4 py-4 pr-14 text-left sm:pr-12">
          <SheetTitle className="text-lg leading-snug break-words capitalize">
            Требует внимания
            {row ? `: ${monthTitle(row.month)}` : ''}
          </SheetTitle>
          <SheetDescription>
            Проверьте найденные расхождения по зарплате за этот период
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {issues.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                За этот месяц нет отдельных контрольных проблем. Можно открыть начисления за
                период для ручной проверки.
              </p>
              {row ? (
                <Button
                  type="button"
                  className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                  onClick={() => onOpenAccruals(row.monthStart, row.monthEnd)}
                >
                  Открыть начисления
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-3">
              {issues.map((issue) => (
                <IssueCard
                  key={issue.kind}
                  issue={issue}
                  monthStart={row?.monthStart ?? ''}
                  monthEnd={row?.monthEnd ?? ''}
                  onOpenAccruals={onOpenAccruals}
                  onOpenPayouts={onOpenPayouts}
                  onOpenExpenses={onOpenExpenses}
                />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
