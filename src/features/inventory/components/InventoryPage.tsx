import { ClipboardList, Package, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadMoreButton } from '@/components/shared/LoadMoreButton'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { InventoryItem } from '@/types'
import { useCurrentUser } from '@/features/auth/hooks'
import { useDictionary } from '@/features/dictionaries/hooks'
import { inventoryHelp } from '@/features/help/content'
import { useInventory, useInventoryOperations, useInventoryQueueIssues, useRestoreInventoryItem } from '@/features/inventory/hooks'
import { getCategoryLabel } from '@/features/inventory/utils'
import { ShipmentRequestFormDialog } from '@/features/shipment-requests/components/ShipmentRequestFormDialog'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { usePagedItems } from '@/hooks/usePagedItems'
import { hasAction } from '@/lib/permissionActions'
import { CategoryFilter } from './CategoryFilter'
import { AdjustmentModal } from './AdjustmentModal'
import { ArchiveInventoryItemDialog } from './ArchiveInventoryItemDialog'
import { ExpenseModal } from './ExpenseModal'
import { IncomeModal } from './IncomeModal'
import { InventoryCard } from './InventoryCard'
import { InventoryDetailSheet } from './InventoryDetailSheet'
import { InventoryItemFormModal } from './InventoryItemFormModal'
import { InventoryOfflinePanel } from './InventoryOfflinePanel'
import { InventoryOperationsMenu } from './InventoryOperationsMenu'
import { InventoryOperationsTable } from './InventoryOperationsTable'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'

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
  const canDeleteOrArchive = hasAction(
    perms?.actions,
    'inventory.delete_or_archive',
    user?.role,
  )
  const canShipmentRequest = hasAction(perms?.actions, 'shipment_requests.manage', user?.role)

  const [listStatus, setListStatus] = useState<'active' | 'archived' | 'all'>('active')
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
  const { data: categories = [] } = useDictionary('inventory_category')
  const cropNameByCode = useMemo(
    () => Object.fromEntries(crops.map((row) => [row.code, row.name])),
    [crops],
  )
  const categoryNameByCode = useMemo(
    () => Object.fromEntries(categories.map((row) => [row.code, row.name])),
    [categories],
  )

  const { data: items = [], isLoading } = useInventory({
    category,
    search: debouncedSearch,
    status: listStatus,
    cropNameByCode,
  })
  const { data: allItems = [] } = useInventory({ status: 'active' })
  const { data: operations = [], isLoading: operationsLoading } = useInventoryOperations()
  const queueIssues = useInventoryQueueIssues()
  const issueItemIds = useMemo(
    () => new Set(queueIssues.map((row) => row.itemId)),
    [queueIssues],
  )
  const itemsPage = usePagedItems(items, `${category}|${debouncedSearch}|${listStatus}`, 40)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<InventoryItem | null>(null)
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [shipmentItemId, setShipmentItemId] = useState<string | null>(null)

  const restoreItem = useRestoreInventoryItem()

  const modalItems = allItems.length > 0 ? allItems : items
  const setCategory = onCategoryChange ?? (() => undefined)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Склад ТМЦ</h1>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 min-w-[9rem] flex-1 justify-center sm:min-h-8 sm:flex-none"
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
            <InventoryOperationsMenu
              className="min-w-[9rem] flex-1 sm:flex-none"
              onIncome={() => setIncomeOpen(true)}
              onExpense={() => setExpenseOpen(true)}
              onAdjust={() => setAdjustOpen(true)}
            />
          ) : null}
          {canShipmentRequest ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 min-w-[9rem] flex-1 justify-center sm:min-h-8 sm:flex-none"
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
            className="min-h-11 pl-9 sm:min-h-9"
            aria-label="Поиск по складу"
          />
        </div>
        <div className="w-full sm:w-40">
          <LabeledSelect
            value={listStatus}
            options={selectOptions([
              { value: 'active', label: 'Активные' },
              { value: 'archived', label: 'Архивные' },
              { value: 'all', label: 'Все' },
            ])}
            placeholder="Статус"
            onValueChange={(value) => {
              if (value === 'archived' || value === 'all' || value === 'active') {
                setListStatus(value)
              }
            }}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[14rem]">
          <CategoryFilter value={category} onChange={setCategory} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl sm:h-36" />
          ))}
        </div>
      ) : items.length === 0 && !debouncedSearch && category === 'all' && listStatus === 'active' ? (
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
          description={
            listStatus === 'archived'
              ? 'Архивных позиций нет. Измените фильтр статуса.'
              : 'Измените поиск, статус или категорию, либо оформите приход.'
          }
          action={
            listStatus === 'archived'
              ? undefined
              : { label: 'Оформить приход', onClick: () => setIncomeOpen(true) }
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-3">
            {itemsPage.visible.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                categoryLabel={
                  categoryNameByCode[item.category] ?? getCategoryLabel(item.category)
                }
                cropLabel={
                  item.cropCode
                    ? [
                        cropNameByCode[item.cropCode] ?? item.cropCode,
                        item.varietyName,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : null
                }
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
                onArchive={
                  canDeleteOrArchive && item.isActive !== false
                    ? (row) => setArchiveTarget(row)
                    : undefined
                }
                onRestore={
                  canDeleteOrArchive && item.isActive === false
                    ? (row) => {
                        void restoreItem.mutateAsync({ id: row.id })
                      }
                    : undefined
                }
                onShipmentRequest={
                  canShipmentRequest && item.isActive !== false
                    ? (row) => {
                        setShipmentItemId(row.id)
                        setShipmentOpen(true)
                      }
                    : undefined
                }
              />
            ))}
          </div>
          <LoadMoreButton
            shown={itemsPage.shown}
            total={itemsPage.total}
            hasMore={itemsPage.hasMore}
            onLoadMore={itemsPage.loadMore}
          />
        </div>
      )}

      <InventoryOperationsTable
        operations={operations}
        isLoading={operationsLoading}
        showViewAll
        pageSize={40}
      />

      <IncomeModal open={incomeOpen} items={modalItems} onClose={() => setIncomeOpen(false)} />
      <ExpenseModal open={expenseOpen} items={modalItems} onClose={() => setExpenseOpen(false)} />
      <AdjustmentModal open={adjustOpen} items={modalItems} onClose={() => setAdjustOpen(false)} />
      <InventoryDetailSheet
        item={selectedItem}
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />
      {canDeleteOrArchive ? (
        <ArchiveInventoryItemDialog
          open={Boolean(archiveTarget)}
          item={archiveTarget}
          onClose={() => setArchiveTarget(null)}
        />
      ) : null}
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
