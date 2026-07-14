import { MoreHorizontal, Package, Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
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
import type { InventoryItem } from '@/types'
import { getCategoryLabel } from '@/features/inventory/utils'
import {
  useSettingsInventoryItems,
  useUpdateInventoryItem,
} from '@/features/settings/hooks'
import { InventoryItemFormModal } from './InventoryItemFormModal'
import { ActiveStatusBadge } from './StatusControls'

export function InventoryItemsTab() {
  const { data: items = [], isLoading } = useSettingsInventoryItems()
  const updateItem = useUpdateInventoryItem()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          Добавить позицию
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Позиций нет"
          action={{
            label: 'Добавить позицию',
            onClick: () => {
              setEditing(null)
              setFormOpen(true)
            },
          }}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Ед.изм</TableHead>
                <TableHead>Мин.запас</TableHead>
                <TableHead>Ёмкость</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{getCategoryLabel(item.category)}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.minStock.toLocaleString('ru-RU')}</TableCell>
                  <TableCell>{item.totalCapacity.toLocaleString('ru-RU')}</TableCell>
                  <TableCell>
                    <ActiveStatusBadge isActive={item.isActive} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                        aria-label="Действия"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(item)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateItem.mutate({ id: item.id, isActive: !item.isActive })
                          }
                        >
                          {item.isActive ? (
                            <>
                              <UserX className="size-4" />
                              Деактивировать
                            </>
                          ) : (
                            <>
                              <UserCheck className="size-4" />
                              Активировать
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InventoryItemFormModal
        key={editing?.id ?? 'create'}
        open={formOpen}
        item={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
