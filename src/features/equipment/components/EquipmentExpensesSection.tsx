import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExpenseFormModal } from '@/features/expenses/components/ExpenseFormModal'
import { useExpenses } from '@/features/expenses/hooks'
import { formatMoney, getCategoryLabel, sumExpenses } from '@/features/expenses/utils'
import { useDictionary } from '@/features/dictionaries/hooks'

type EquipmentExpensesSectionProps = {
  equipmentId: string
  canManage: boolean
}

export function EquipmentExpensesSection({
  equipmentId,
  canManage,
}: EquipmentExpensesSectionProps) {
  const { data: expenses = [], isLoading } = useExpenses({ equipmentId })
  const { data: categories = [] } = useDictionary('expense_category', { activeOnly: false })
  const [formOpen, setFormOpen] = useState(false)

  const year = new Date().getFullYear()
  const yearTotal = useMemo(
    () =>
      sumExpenses(
        expenses.filter((item) => {
          const [, , y] = item.date.split('.').map(Number)
          return y === year
        }),
      ),
    [expenses, year],
  )
  const total = useMemo(() => sumExpenses(expenses), [expenses])
  const latest = expenses.slice(0, 5)

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Затраты</h2>
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="size-3.5" />
            Затрата
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <p className="text-foreground">
          Всего: <span className="font-semibold">{formatMoney(total)}</span>
        </p>
        <p className="text-muted-foreground">
          За этот год: <span className="font-medium text-foreground">{formatMoney(yearTotal)}</span>
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : latest.length === 0 ? (
        <p className="text-sm text-muted-foreground">Затрат по этой технике пока нет</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Описание</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latest.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.date}</TableCell>
                  <TableCell>{getCategoryLabel(expense.category, categories)}</TableCell>
                  <TableCell>{formatMoney(expense.amount)}</TableCell>
                  <TableCell className="max-w-48 truncate">{expense.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {canManage ? (
        <ExpenseFormModal
          key={`eq-${equipmentId}`}
          open={formOpen}
          defaultEquipmentId={equipmentId}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
    </section>
  )
}
