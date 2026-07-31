import { ClipboardList, Minus, Package, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { InventoryItem } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { useDictionary } from '@/features/dictionaries/hooks'
import { inventoryHelp } from '@/features/help/content'
import { useInventory, useInventoryOperations, useInventoryQueueIssues } from '@/features/inventory/hooks'
import { ShipmentRequestFormDialog } from '@/features/shipment-requests/components/ShipmentRequestFormDialog'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { hasAction } from '@/lib/permissionActions'
import { CategoryFilter } from './CategoryFilter'
import { AdjustmentModal } from './AdjustmentModal'
import { ExpenseModal } from './ExpenseModal'
import { IncomeModal } from './IncomeModal'
import { InventoryCard } from './InventoryCard'
import { InventoryDetailSheet } from './InventoryDetailSheet'
import { InventoryItemFormModal } from './InventoryItemFormModal'
import { InventoryOfflinePanel } from './InventoryOfflinePanel'
import { InventoryOperationsTable } from './InventoryOperationsTable'

type InventoryPageProps = {
  category?: string
  search?: string
  onCategoryChange?: (category: string) => void
  onSearchChange?: (search: string) => void
}

export function InventoryPage({
  category = 'all',
  search = '',
  onCategoryChange,
  onSearchChange,
}: InventoryPageProps) {
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const canManage = hasAction(perms?.actions, 'inventory.manage_items', user?.role)
  const canOperate = hasAction(perms?.actions, 'inventory.operate', user?.role)
  const canShipmentRequest = hasAction(perms?.actions, 'shipment_requests.manage', user?.role)

  const [searchInput, setSearchInput] = useState(search)
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim())
  const onSearchChangeRef = useRef(onSearchChange)
  onSearchChangeRef.current = onSearchChange
  const lastSyncedSearchRef = useRef(search.trim())

  // Apply external URL changes (back/forward) without clobbering in-progress typing we just synced.
  useEffect(() => {
    const fromUrl = search.trim()
    if (fromUrl === lastSyncedSearchRef.current) return
    lastSyncedSearchRef.current = fromUrl
    setSearchInput(fromUrl)
    setDebouncedSearch(fromUrl)
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim()
      setDebouncedSearch(next)
      if (next === lastSyncedSearchRef.current) return
      lastSyncedSearchRef.current = next
      onSearchChangeRef.current?.(next)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data: crops = [] } = useDictionary('crop')
  const cropNameByCode = useMemo(
    () => Object.fromEntries(crops.map((row) => [row.code, row.name])),
    [crops],
  )

  const { data: items = [], isLoading } = useInventory({
    category,
    search: debouncedSearch,
    cropNameByCode,
  })
  const { data: allItems = [] } = useInventory()
  const { data: operations = [], isLoading: operationsLoading } = useInventoryOperations()
  const queueIssues = useInventoryQueueIssues()
  const issueItemIds = useMemo(
    () => new Set(queueIssues.map((row) => row.itemId)),
    [queueIssues],
  )
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [shipmentItemId, setShipmentItemId] = useState<string | null>(null)

  const modalItems = allItems.length > 0 ? allItems : items
  const setCategory = onCategoryChange ?? (() => undefined)

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
          {canOperate ? (
            <Button
              type="button"
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={() => setIncomeOpen(true)}
            >
              <Plus className="size-4" />
              Приход
            </Button>
          ) : null}
          {canOperate ? (
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setExpenseOpen(true)}
            >
              <Minus className="size-4" />
              Расход
            </Button>
          ) : null}
          {canOperate ? (
            <Button type="button" variant="outline" onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal className="size-4" />
              Корректировка
            </Button>
          ) : null}
          {canShipmentRequest ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShipmentItemId(null)
                setShipmentOpen(true)
              }}
            >
              <ClipboardList className="size-4" />
              Заявка
            </Button>
          ) : null}
        </div>
      </div>

      <RoleSectionHelp section="склад" items={inventoryHelp} guideSection="inventory" />
      <ManageInSettingsLink tab="inventory-cats" tabHint="категории ТМЦ" />

      <InventoryOfflinePanel />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={
              category === 'harvest'
                ? 'Поиск по названию или культуре…'
                : 'Поиск по названию…'
            }
            className="pl-9"
            aria-label="Поиск по складу"
          />
        </div>
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 && !debouncedSearch && category === 'all' ? (
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
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Ничего не найдено"
          description="Измените поиск или категорию, либо оформите приход."
          action={{ label: 'Оформить приход', onClick: () => setIncomeOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {items.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              hasSyncIssue={issueItemIds.has(item.id)}
              onClick={setSelectedItem}
              onEdit={
                canManage
                  ? (row) => {
                      setEditing(row)
                      setFormOpen(true)
                    }
                  : undefined
              }
              onShipmentRequest={
                canShipmentRequest
                  ? (row) => {
                      setShipmentItemId(row.id)
                      setShipmentOpen(true)
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <InventoryOperationsTable operations={operations} isLoading={operationsLoading} />

      <IncomeModal open={incomeOpen} items={modalItems} onClose={() => setIncomeOpen(false)} />
      <ExpenseModal open={expenseOpen} items={modalItems} onClose={() => setExpenseOpen(false)} />
      <AdjustmentModal open={adjustOpen} items={modalItems} onClose={() => setAdjustOpen(false)} />
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
      {canShipmentRequest ? (
        <ShipmentRequestFormDialog
          open={shipmentOpen}
          initialInventoryItemId={shipmentItemId}
          onClose={() => {
            setShipmentOpen(false)
            setShipmentItemId(null)
          }}
        />
      ) : null}
    </div>
  )
}
