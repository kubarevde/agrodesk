import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExpenseFormModal } from '@/features/expenses/components/ExpenseFormModal'
import { useExpenses } from '@/features/expenses/hooks'
import { formatMoney, getCategoryLabel } from '@/features/expenses/utils'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useImplementMaintenance } from '@/features/implements/hooks'
import { formatMeterDate } from '@/features/equipment/types'
import { AssetExpensesList, type AssetExpenseRow } from './AssetExpensesList'

type AssetExpensesSectionProps = {
  equipmentId?: string
  implementId?: string
  canManage: boolean
}

export function AssetExpensesSection({
  equipmentId,
  implementId,
  canManage,
}: AssetExpensesSectionProps) {
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(
    equipmentId ? { equipmentId } : {},
    Boolean(equipmentId),
  )
  const { data: maintenance = [], isLoading: maintenanceLoading } = useImplementMaintenance(
    implementId,
  )
  const { data: categories = [] } = useDictionary('expense_category', { activeOnly: false })
  const [formOpen, setFormOpen] = useState(false)

  const rows: AssetExpenseRow[] = useMemo(() => {
    if (equipmentId) {
      return expenses.map((expense) => ({
        id: expense.id,
        date: expense.date,
        category: getCategoryLabel(expense.category, categories),
        amount: expense.amount,
        description: expense.description,
      }))
    }
    return maintenance
      .filter((record) => record.cost != null && record.cost > 0)
      .map((record) => ({
        id: record.id,
        date: formatMeterDate(String(record.date)),
        category: record.type,
        amount: record.cost ?? 0,
        description: record.description,
      }))
  }, [categories, equipmentId, expenses, maintenance])

  const isLoading = equipmentId ? expensesLoading : maintenanceLoading
  const year = new Date().getFullYear()
  const yearTotal = useMemo(
    () =>
      rows
        .filter((item) => item.date.split('.').map(Number)[2] === year)
        .reduce((sum, item) => sum + item.amount, 0),
    [rows, year],
  )
  const total = useMemo(() => rows.reduce((sum, item) => sum + item.amount, 0), [rows])
  const latest = rows.slice(0, 5)
  const emptyLabel = equipmentId
    ? 'Затрат по этой технике пока нет'
    : 'Затрат по ТО пока нет — они появятся после записи ТО с суммой'

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Затраты</h2>
        {canManage && equipmentId ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-10"
            onClick={() => setFormOpen(true)}
          >
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
      ) : (
        <AssetExpensesList
          rows={latest}
          emptyLabel={emptyLabel}
          categoryHeader={equipmentId ? 'Категория' : 'Тип ТО'}
        />
      )}

      {canManage && equipmentId ? (
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
