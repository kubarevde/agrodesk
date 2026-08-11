import type { Expense } from '@/types'
import { ExpenseFormModal } from './ExpenseFormModal'
import { ExpenseKpiCards } from './ExpenseKpiCards'
import { ExpensesByCategoryChart } from './ExpensesByCategoryChart'
import { ExpensesCards } from './ExpensesCards'
import { ExpensesFilters } from './ExpensesFilters'
import { ExpensesTable } from './ExpensesTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { OnlineOnlyNotice } from '@/components/shared/OnlineOnlyNotice'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { DollarSign } from 'lucide-react'

interface ExpensesTabProps {
  canManage: boolean
  canDelete: boolean
  isOnline: boolean
  from: string
  to: string
  category?: string
  equipmentId?: string
  defaultFrom: string
  defaultTo: string
  onRangeChange: (range: { from?: string; to?: string }) => void
  onCategoryChange: (value: string | undefined) => void
  onEquipmentChange: (value: string | undefined) => void
  expenses: Expense[]
  isLoading: boolean
  periodTotal: number
  largestCategory: { category: string; amount: number } | null
  chartData: Array<{ category: string; amount: number; percent: number }>
  formOpen: boolean
  editingExpense: Expense | null
  onOpenCreate: () => void
  onEdit: (item: Expense) => void
  onDelete: (item: Expense) => void
  onCloseForm: () => void
}

export function ExpensesTab({
  canManage,
  canDelete,
  isOnline,
  from,
  to,
  category,
  equipmentId,
  defaultFrom,
  defaultTo,
  onRangeChange,
  onCategoryChange,
  onEquipmentChange,
  expenses,
  isLoading,
  periodTotal,
  largestCategory,
  chartData,
  formOpen,
  editingExpense,
  onOpenCreate,
  onEdit,
  onDelete,
  onCloseForm,
}: ExpensesTabProps) {
  return (
    <div className="space-y-6" data-testid="expenses-tab">
      {!isOnline ? (
        <OnlineOnlyNotice
          hideWhenOnline={false}
          title="Затраты: только просмотр / онлайн-запись"
          description="Создавать и менять затраты без сети нельзя. Смены ведите офлайн в «Рабочем времени»."
        />
      ) : null}

      <ExpenseKpiCards
        totalAmount={periodTotal}
        largestCategory={largestCategory}
        recordsCount={expenses.length}
        isLoading={isLoading}
      />

      <ExpensesFilters
        from={from}
        to={to}
        category={category}
        equipmentId={equipmentId}
        onRangeChange={({ from: nextFrom, to: nextTo }) => {
          onRangeChange({ from: nextFrom ?? defaultFrom, to: nextTo ?? defaultTo })
        }}
        onCategoryChange={onCategoryChange}
        onEquipmentChange={onEquipmentChange}
      />

      <ExpensesByCategoryChart data={chartData} isLoading={isLoading} />

      {isLoading ? (
        <SkeletonTable rows={5} columns={8} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Затрат за период нет"
          description="Измените фильтры или добавьте первую затрату"
          action={canManage ? { label: 'Добавить затрату', onClick: onOpenCreate } : undefined}
        />
      ) : (
        <>
          <ExpensesCards
            expenses={expenses}
            canEdit={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          <ExpensesTable
            expenses={expenses}
            canEdit={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </>
      )}

      {canManage ? (
        <ExpenseFormModal
          key={editingExpense?.id ?? 'create'}
          open={formOpen}
          expense={editingExpense}
          onClose={onCloseForm}
        />
      ) : null}
    </div>
  )
}
