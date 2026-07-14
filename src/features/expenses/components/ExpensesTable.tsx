import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Expense } from '@/types'
import {
  CATEGORY_LABELS,
  formatMoney,
  getCategoryBadgeClass,
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

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>Поставщик</TableHead>
            <TableHead>Оплата</TableHead>
            {showActions ? <TableHead>Действия</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>{expense.date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getCategoryBadgeClass(expense.category)}>
                  {CATEGORY_LABELS[expense.category]}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{formatMoney(expense.amount)}</TableCell>
              <TableCell>{expense.description}</TableCell>
              <TableCell>{expense.supplier || '—'}</TableCell>
              <TableCell>
                {expense.paymentMethod
                  ? PAYMENT_LABELS[expense.paymentMethod as PaymentMethod]
                  : '—'}
              </TableCell>
              {showActions ? (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                      aria-label="Действия"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit ? (
                        <DropdownMenuItem onClick={() => onEdit(expense)}>
                          <Pencil className="size-4" />
                          Редактировать
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete ? (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(expense)}
                        >
                          <Trash2 className="size-4" />
                          Удалить
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
