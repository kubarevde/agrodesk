import { List, Map as MapIcon, Plus, Tractor } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@/features/auth/hooks'
import {
  useCreateEquipment,
  useEquipment,
  useUpdateEquipment,
} from '@/features/equipment/hooks'
import type { EquipmentFormValues } from '@/features/equipment/schemas'
import type { EquipmentDetail } from '@/features/equipment/types'
import { useImplements } from '@/features/implements/hooks'
import { EquipmentCard } from './EquipmentCard'
import { EquipmentFormDialog } from './EquipmentFormDialog'
import { EquipmentMap } from './EquipmentMap'
import { EquipmentSharingModal } from './EquipmentSharingModal'

export function EquipmentPage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const canDeactivate = user?.role === 'admin'

  const { data: items = [], isLoading, isError } = useEquipment({ is_active: true })
  const { data: allImplements = [] } = useImplements()
  const createItem = useCreateEquipment()
  const updateItem = useUpdateEquipment()

  const [view, setView] = useState<'list' | 'map'>('list')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EquipmentDetail | null>(null)
  const [shareItem, setShareItem] = useState<EquipmentDetail | null>(null)

  const implementsByEquipment = useMemo(() => {
    const map: Record<string, typeof allImplements> = {}
    for (const row of allImplements) {
      if (!row.current_equipment_id) continue
      const list = map[row.current_equipment_id] ?? []
      list.push(row)
      map[row.current_equipment_id] = list
    }
    return map
  }, [allImplements])

  useEffect(() => {
    if (isError) toast.error('Не удалось загрузить технику')
  }, [isError])

  const handleSubmit = async (values: EquipmentFormValues) => {
    if (editing) await updateItem.mutateAsync({ id: editing.id, values })
    else await createItem.mutateAsync(values)
  }

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Техника</h1>
        {canManage ? (
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            Добавить технику
          </Button>
        ) : null}
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'map')}>
        <TabsList>
          <TabsTrigger value="list">
            <List className="size-4" />
            Список
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapIcon className="size-4" />
            Карта
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {items.length === 0 ? (
            <EmptyState
              icon={Tractor}
              title="Нет техники"
              description="Добавьте первую единицу техники для учёта счётчиков и ТО."
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
              {items.map((item) => (
                <EquipmentCard
                  key={item.id}
                  item={item}
                  implements={implementsByEquipment[item.id] ?? []}
                  canManage={canManage}
                  canDeactivate={canDeactivate}
                  onDetails={(row) => {
                    void navigate({
                      to: '/equipment/$equipmentId',
                      params: { equipmentId: row.id },
                    })
                  }}
                  onEdit={(row) => {
                    setEditing(row)
                    setFormOpen(true)
                  }}
                  onShare={setShareItem}
                  onDeactivate={(row) => {
                    if (window.confirm(`Деактивировать «${row.name}»?`)) {
                      void updateItem.mutateAsync({
                        id: row.id,
                        values: { is_active: false },
                      })
                    }
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <EquipmentMap items={items} implementsByEquipment={implementsByEquipment} />
        </TabsContent>
      </Tabs>

      <EquipmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        isPending={createItem.isPending || updateItem.isPending}
        onSubmit={handleSubmit}
      />
      <EquipmentSharingModal
        open={Boolean(shareItem)}
        onOpenChange={(open) => {
          if (!open) setShareItem(null)
        }}
        item={shareItem}
      />
    </div>
  )
}
