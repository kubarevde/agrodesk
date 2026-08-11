import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Expense } from '@/types'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  formatMoney,
  getCategoryBadgeClass,
  getCategoryLabel,
  PAYMENT_LABELS,
  type PaymentMethod,
} from '@/features/expenses/utils'

interface ExpensesTableProps {
  expenses: Expense[]
  canEdit: boolean
  canDelete: boolean
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ExpensesTable({
  expenses,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ExpensesTableProps) {
  const showActions = canEdit || canDelete
  const { data: categories = [] } = useDictionary('expense_category', { activeOnly: false })

  return (
    <div
      className="hidden overflow-x-auto rounded-lg border border-border md:block"
      data-layout="table"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>Техника</TableHead>
            <TableHead>Поставщик</TableHead>
            <TableHead>Оплата</TableHead>
            {showActions ? <TableHead>Действия</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => {
            const rowActions = [
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
              <TableRow key={expense.id}>
                <TableCell>{expense.date}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getCategoryBadgeClass(expense.category)}>
                    {getCategoryLabel(expense.category, categories)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{formatMoney(expense.amount)}</TableCell>
                <TableCell>{expense.description}</TableCell>
                <TableCell>{expense.equipmentName || '—'}</TableCell>
                <TableCell>{expense.supplier || '—'}</TableCell>
                <TableCell>
                  {expense.paymentMethod
                    ? PAYMENT_LABELS[expense.paymentMethod as PaymentMethod]
                    : '—'}
                </TableCell>
                {showActions ? (
                  <TableCell>
                    <CardActionsMenu
                      actions={rowActions}
                      title={expense.description || 'Затрата'}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
