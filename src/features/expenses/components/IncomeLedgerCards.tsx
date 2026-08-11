import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import type { IncomeLedgerEntry } from '@/types'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  formatIncomeMoney,
  getIncomeCategoryLabel,
  INCOME_SOURCE_LABELS,
} from '../incomeUtils'
import { getCategoryBadgeClass, PAYMENT_LABELS, type PaymentMethod } from '../utils'

type IncomeLedgerCardsProps = {
  rows: IncomeLedgerEntry[]
  canEdit: boolean
  canDelete: boolean
  onEdit: (entry: IncomeLedgerEntry) => void
  onDelete: (entry: IncomeLedgerEntry) => void
}

/** Mobile card list for incomes (table stays on md+), mirrors ExpensesCards. */
export function IncomeLedgerCards({
  rows,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: IncomeLedgerCardsProps) {
  const { data: categories = [] } = useDictionary('income_category', { activeOnly: false })

  return (
    <ul className="space-y-3 md:hidden" data-layout="cards">
      {rows.map((row) => {
        const categoryLabel =
          row.source === 'manual'
            ? getIncomeCategoryLabel(row.title, categories)
            : row.title
        const actions = [
          ...(canEdit
            ? [
                {
                  id: 'edit',
                  label: 'Редактировать',
                  icon: Pencil,
                  onSelect: () => onEdit(row),
                },
              ]
            : []),
          ...(canDelete
            ? [
                {
                  id: 'delete',
                  label: 'Удалить',
                  icon: Trash2,
                  variant: 'destructive' as const,
                  onSelect: () => onDelete(row),
                },
              ]
            : []),
        ]

        return (
          <li key={row.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{formatIncomeMoney(row.amount)}</p>
                <p className="text-sm text-muted-foreground">{row.date}</p>
              </div>
              {actions.length > 0 ? (
                <CardActionsMenu
                  actions={actions}
                  title={row.description || categoryLabel}
                />
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{INCOME_SOURCE_LABELS[row.source]}</Badge>
              {row.source === 'manual' ? (
                <Badge variant="outline" className={getCategoryBadgeClass(row.title)}>
                  {categoryLabel}
                </Badge>
              ) : (
                <Badge variant="outline">{categoryLabel}</Badge>
              )}
              {row.paymentMethod ? (
                <Badge variant="outline">
                  {PAYMENT_LABELS[row.paymentMethod as PaymentMethod]}
                </Badge>
              ) : null}
            </div>

            {row.description ? (
              <p className="mt-2 text-sm text-foreground">{row.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {row.counterparty || 'Без контрагента'}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
