import { DollarSign, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import type { Expense } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { useDeleteExpense, useExpenses } from '@/features/expenses/hooks'
import {
  findLargestCategory,
  groupExpensesByCategory,
  sumExpenses,
  type ExpenseCategory,
} from '@/features/expenses/utils'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { ExpenseFormModal } from './ExpenseFormModal'
import { ExpenseKpiCards } from './ExpenseKpiCards'
import { ExpensesByCategoryChart } from './ExpensesByCategoryChart'
import { ExpensesFilters } from './ExpensesFilters'
import { ExpensesTable } from './ExpensesTable'

export function ExpensesPage() {
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const canDelete = user?.role === 'admin'

  const monthRange = useMemo(() => getDefaultMonthRange(), [])
  const [from, setFrom] = useState(monthRange.from)
  const [to, setTo] = useState(monthRange.to)
  const [category, setCategory] = useState<ExpenseCategory | undefined>()
  const [equipmentId, setEquipmentId] = useState<string | undefined>()

  const filters = useMemo(
    () => ({ from, to, category, equipmentId }),
    [category, equipmentId, from, to],
  )

  const {
    data: monthExpenses = [],
    isLoading: monthLoading,
    isError: monthError,
  } = useExpenses(monthRange)

  const { data: expenses = [], isLoading, isError } = useExpenses(filters)

  const deleteExpense = useDeleteExpense()
  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const monthTotal = useMemo(() => sumExpenses(monthExpenses), [monthExpenses])
  const largestCategory = useMemo(() => findLargestCategory(monthExpenses), [monthExpenses])
  const chartData = useMemo(() => groupExpensesByCategory(expenses), [expenses])

  useEffect(() => {
    if (isError || monthError) {
      toast.error('Не удалось загрузить затраты')
    }
  }, [isError, monthError])

  const openCreate = () => {
    setEditingExpense(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Затраты</h1>
        {canManage ? (
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Добавить затрату
          </Button>
        ) : null}
      </div>

      <ExpenseKpiCards
        totalAmount={monthTotal}
        largestCategory={largestCategory}
        recordsCount={monthExpenses.length}
        isLoading={monthLoading}
      />

      <ExpensesFilters
        from={from}
        to={to}
        category={category}
        equipmentId={equipmentId}
        onRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom ?? monthRange.from)
          setTo(nextTo ?? monthRange.to)
        }}
        onCategoryChange={setCategory}
        onEquipmentChange={setEquipmentId}
      />

      <ExpensesByCategoryChart data={chartData} isLoading={isLoading} />

      {isLoading ? (
        <SkeletonTable rows={5} columns={8} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Затрат за период нет"
          description="Измените фильтры или добавьте первую затрату"
          action={
            canManage ? { label: 'Добавить затрату', onClick: openCreate } : undefined
          }
        />
      ) : (
        <ExpensesTable
          expenses={expenses}
          canEdit={Boolean(canManage)}
          canDelete={Boolean(canDelete)}
          onEdit={(item) => {
            setEditingExpense(item)
            setFormOpen(true)
          }}
          onDelete={(item) => deleteExpense.mutate(item.id)}
        />
      )}

      {canManage ? (
        <ExpenseFormModal
          key={editingExpense?.id ?? 'create'}
          open={formOpen}
          expense={editingExpense}
          onClose={() => {
            setFormOpen(false)
            setEditingExpense(null)
          }}
        />
      ) : null}
    </div>
  )
}
