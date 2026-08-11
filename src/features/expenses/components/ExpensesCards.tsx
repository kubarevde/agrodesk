import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import type { Expense } from '@/types'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  formatMoney,
  getCategoryBadgeClass,
  getCategoryLabel,
  PAYMENT_LABELS,
  type PaymentMethod,
} from '@/features/expenses/utils'

type ExpensesCardsProps = {
  expenses: Expense[]
  canEdit: boolean
  canDelete: boolean
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

/** Mobile card list for expenses (table stays on md+). */
export function ExpensesCards({
  expenses,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ExpensesCardsProps) {
  const { data: categories = [] } = useDictionary('expense_category', { activeOnly: false })

  return (
    <ul className="space-y-3 md:hidden" data-layout="cards">
      {expenses.map((expense) => {
        const actions = [
          ...(canEdit
            ? [
                {
                  id: 'edit',
                  label: 'Редактировать',
                  icon: Pencil,
                  onSelect: () => onEdit(expense),
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
                  onSelect: () => onDelete(expense),
                },
              ]
            : []),
        ]

        return (
          <li
            key={expense.id}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{formatMoney(expense.amount)}</p>
                <p className="text-sm text-muted-foreground">{expense.date}</p>
              </div>
              {actions.length > 0 ? (
                <CardActionsMenu
                  actions={actions}
                  title={expense.description || 'Затрата'}
                />
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className={getCategoryBadgeClass(expense.category)}>
                {getCategoryLabel(expense.category, categories)}
              </Badge>
              {expense.paymentMethod ? (
                <Badge variant="outline">
                  {PAYMENT_LABELS[expense.paymentMethod as PaymentMethod]}
                </Badge>
              ) : null}
            </div>

            {expense.description ? (
              <p className="mt-2 text-sm text-foreground">{expense.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {[expense.equipmentName || null, expense.supplier || null]
                .filter(Boolean)
                .join(' · ') || 'Без техники / поставщика'}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
