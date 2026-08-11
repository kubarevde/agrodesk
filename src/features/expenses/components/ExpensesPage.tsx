import { getRouteApi } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Expense } from '@/types'
import { ForecastTab } from '@/features/analytics/components/ForecastPage'
import { useCurrentUser } from '@/features/auth/hooks'
import { useDeleteExpense, useExpenses } from '@/features/expenses/hooks'
import { getExpensesPageHelp } from '@/features/help/pageTabHelp'
import {
  findLargestCategory,
  groupExpensesByCategory,
  sumExpenses,
} from '@/features/expenses/utils'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { ExpensesTab } from './ExpensesTab'
import { IncomeTab } from './IncomeTab'

const expensesRoute = getRouteApi('/_layout/expenses/')

export type ExpensesPageTab = 'expenses' | 'income' | 'forecast'

export function ExpensesPage({
  initialTab = 'expenses',
  initialCategory,
  initialFrom,
  initialTo,
}: {
  initialTab?: ExpensesPageTab
  initialCategory?: string
  initialFrom?: string
  initialTo?: string
}) {
  const navigate = expensesRoute.useNavigate()
  const { data: user } = useCurrentUser()
  const isOnline = useOnlineStatus()
  const canManage = (user?.role === 'admin' || user?.role === 'manager') && isOnline
  const canDelete = user?.role === 'admin' && isOnline

  const monthRange = useMemo(() => getDefaultMonthRange(), [])
  const [from, setFrom] = useState(initialFrom ?? monthRange.from)
  const [to, setTo] = useState(initialTo ?? monthRange.to)
  const [category, setCategory] = useState<string | undefined>(initialCategory)
  const [equipmentId, setEquipmentId] = useState<string | undefined>()
  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [incomeFormOpen, setIncomeFormOpen] = useState(false)

  useEffect(() => {
    if (initialFrom) setFrom(initialFrom)
    if (initialTo) setTo(initialTo)
    if (initialCategory !== undefined) setCategory(initialCategory)
  }, [initialFrom, initialTo, initialCategory])

  const tab: ExpensesPageTab =
    initialTab === 'income' ? 'income' : initialTab === 'forecast' ? 'forecast' : 'expenses'
  const filters = useMemo(
    () => ({ from, to, category, equipmentId }),
    [category, equipmentId, from, to],
  )

  const { data: expenses = [], isLoading, isError } = useExpenses(filters, tab === 'expenses')
  const deleteExpense = useDeleteExpense()

  const periodTotal = useMemo(() => sumExpenses(expenses), [expenses])
  const largestCategory = useMemo(() => findLargestCategory(expenses), [expenses])
  const chartData = useMemo(() => groupExpensesByCategory(expenses), [expenses])

  useEffect(() => {
    if (tab === 'expenses' && isError) {
      toast.error('Не удалось загрузить затраты')
    }
  }, [isError, tab])

  const syncSearch = (patch: {
    from?: string
    to?: string
    category?: string | undefined
  }) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...(patch.from !== undefined ? { from: patch.from } : {}),
        ...(patch.to !== undefined ? { to: patch.to } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
      }),
    })
  }

  const onRangeChange = ({ from: nextFrom, to: nextTo }: { from?: string; to?: string }) => {
    const nextFromValue = nextFrom ?? monthRange.from
    const nextToValue = nextTo ?? monthRange.to
    setFrom(nextFromValue)
    setTo(nextToValue)
    syncSearch({ from: nextFromValue, to: nextToValue })
  }

  const onCategoryChange = (next: string | undefined) => {
    setCategory(next)
    syncSearch({ category: next })
  }

  const showCreateButton = canManage && tab !== 'forecast'
  const tabHelp = getExpensesPageHelp(tab)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Затраты и доходы</h1>
        {showCreateButton ? (
          <Button
            type="button"
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground sm:w-auto"
            onClick={() => {
              if (tab === 'income') {
                setIncomeFormOpen(true)
              } else {
                setEditingExpense(null)
                setExpenseFormOpen(true)
              }
            }}
          >
            <Plus className="size-4" />
            {tab === 'income' ? 'Добавить доход' : 'Добавить затрату'}
          </Button>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next: ExpensesPageTab =
            value === 'income' ? 'income' : value === 'forecast' ? 'forecast' : 'expenses'
          void navigate({
            search: (prev) => ({
              ...prev,
              tab: next,
            }),
          })
        }}
        className="w-full min-w-0 gap-4"
      >
        <TabsList className="grid h-auto min-h-11 w-full grid-cols-3 gap-0.5 p-1">
          <TabsTrigger value="expenses" className="min-h-10 px-1.5 py-2 text-xs sm:px-2 sm:text-sm">
            Затраты
          </TabsTrigger>
          <TabsTrigger value="income" className="min-h-10 px-1.5 py-2 text-xs sm:px-2 sm:text-sm">
            Доходы
          </TabsTrigger>
          <TabsTrigger value="forecast" className="min-h-10 px-1.5 py-2 text-xs sm:px-2 sm:text-sm">
            Факт и прогноз
          </TabsTrigger>
        </TabsList>

        <SectionHelp key={tab} section={tabHelp.section} items={tabHelp.items} />

        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab
            canManage={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            isOnline={isOnline}
            from={from}
            to={to}
            category={category}
            equipmentId={equipmentId}
            defaultFrom={monthRange.from}
            defaultTo={monthRange.to}
            onRangeChange={onRangeChange}
            onCategoryChange={onCategoryChange}
            onEquipmentChange={setEquipmentId}
            expenses={expenses}
            isLoading={isLoading}
            periodTotal={periodTotal}
            largestCategory={largestCategory}
            chartData={chartData}
            formOpen={expenseFormOpen}
            editingExpense={editingExpense}
            onOpenCreate={() => {
              setEditingExpense(null)
              setExpenseFormOpen(true)
            }}
            onEdit={(item) => {
              setEditingExpense(item)
              setExpenseFormOpen(true)
            }}
            onDelete={(item) => deleteExpense.mutate(item.id)}
            onCloseForm={() => {
              setExpenseFormOpen(false)
              setEditingExpense(null)
            }}
          />
        </TabsContent>

        <TabsContent value="income" className="mt-4">
          <IncomeTab
            canManage={Boolean(canManage)}
            canDelete={Boolean(canDelete)}
            isOnline={isOnline}
            from={from}
            to={to}
            defaultFrom={monthRange.from}
            defaultTo={monthRange.to}
            onRangeChange={onRangeChange}
            formOpen={incomeFormOpen}
            onFormOpenChange={setIncomeFormOpen}
          />
        </TabsContent>

        <TabsContent value="forecast" className="mt-4 min-w-0">
          <ForecastTab embedded />
        </TabsContent>
      </Tabs>
    </div>
  )
}
