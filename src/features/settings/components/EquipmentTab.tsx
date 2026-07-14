import { MoreHorizontal, Pencil, Plus, UserCheck, UserX, Wrench } from 'lucide-react'
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
import type { Equipment } from '@/types'
import { useSettingsEquipment, useUpdateEquipment } from '@/features/settings/hooks'
import { EquipmentFormModal } from './EquipmentFormModal'
import { ActiveStatusBadge } from './StatusControls'

export function EquipmentTab() {
  const { data: equipment = [], isLoading } = useSettingsEquipment()
  const updateEquipment = useUpdateEquipment()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)

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
          Добавить технику
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} columns={3} />
      ) : equipment.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Техники пока нет"
          action={{
            label: 'Добавить технику',
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
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.type || '—'}</TableCell>
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
                            updateEquipment.mutate({ id: item.id, isActive: !item.isActive })
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

      <EquipmentFormModal
        key={editing?.id ?? 'create'}
        open={formOpen}
        equipment={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
