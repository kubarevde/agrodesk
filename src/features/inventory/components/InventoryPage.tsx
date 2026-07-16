import { Minus, Package, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { InventoryItem } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { inventoryHelp } from '@/features/help/content'
import { useInventory, useInventoryOperations } from '@/features/inventory/hooks'
import { CategoryFilter } from './CategoryFilter'
import { ExpenseModal } from './ExpenseModal'
import { IncomeModal } from './IncomeModal'
import { InventoryCard } from './InventoryCard'
import { InventoryDetailSheet } from './InventoryDetailSheet'
import { InventoryItemFormModal } from './InventoryItemFormModal'
import { InventoryOperationsTable } from './InventoryOperationsTable'

export function InventoryPage() {
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const { data: items = [], isLoading } = useInventory()
  const { data: operations = [], isLoading: operationsLoading } = useInventoryOperations()
  const [category, setCategory] = useState<string>('all')
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)

  const filteredItems = useMemo(() => {
    if (category === 'all') return items
    return items.filter((item) => item.category === category)
  }, [category, items])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Склад ТМЦ</h1>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" />
              Позиция
            </Button>
          ) : null}
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            onClick={() => setIncomeOpen(true)}
          >
            <Plus className="size-4" />
            Приход
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => setExpenseOpen(true)}
          >
            <Minus className="size-4" />
            Расход
          </Button>
        </div>
      </div>

      <SectionHelp title="Справка: склад" items={inventoryHelp} />
      <ManageInSettingsLink tabHint="категории ТМЦ" />

      <CategoryFilter value={category} onChange={setCategory} />

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Позиций нет"
          description="Добавьте позицию склада, затем оформите приход."
          action={
            canManage
              ? {
                  label: 'Добавить позицию',
                  onClick: () => {
                    setEditing(null)
                    setFormOpen(true)
                  },
                }
              : undefined
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Позиций нет"
          description="Выберите другую категорию или оформите приход"
          action={{ label: 'Оформить приход', onClick: () => setIncomeOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filteredItems.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onClick={setSelectedItem}
              onEdit={
                canManage
                  ? (row) => {
                      setEditing(row)
                      setFormOpen(true)
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <InventoryOperationsTable operations={operations} isLoading={operationsLoading} />

      <IncomeModal open={incomeOpen} items={items} onClose={() => setIncomeOpen(false)} />
      <ExpenseModal open={expenseOpen} items={items} onClose={() => setExpenseOpen(false)} />
      <InventoryDetailSheet
        item={selectedItem}
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />
      {canManage ? (
        <InventoryItemFormModal
          key={editing?.id ?? 'create'}
          open={formOpen}
          item={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
